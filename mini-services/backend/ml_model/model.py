"""Temporal Contrastive Graph Learning (TCGL) Model Definition.

This module reconstructs the model architecture from the trained model.pth
and provides inference capabilities for flashcard spaced repetition.

Architecture:
- Node Embedding: 78,139 nodes × 16 dims
- Time Encoder: Linear(1 → 16) — encodes time deltas between reviews
- Graph Conv Layer 1: CustomGraphConv(51 → 64) + BatchNorm
  - Input: embed(16) + time_enc(16) + node_features(19) = 51
- Graph Conv Layer 2: CustomGraphConv(64 → 64) + BatchNorm
- Classifier MLP: 64 → 32 → 1 (predicts recall probability / optimal interval)

Output: scalar in [0, 1] representing recall probability after
        the predicted interval, or can be interpreted as optimal
        half-life for scheduling.
"""

import torch
import torch.nn as nn
from torch_geometric.utils import scatter as pyg_scatter


class CustomGraphConv(nn.Module):
    """Custom graph convolution matching the TCGL model's state_dict.

    Uses separate linear transformations for source (lin_l) and
    target (lin_r) nodes, with mean aggregation of neighbor messages.
    lin_r has no bias (matches the trained weights).
    """

    def __init__(self, in_dim: int, out_dim: int):
        super().__init__()
        self.lin_l = nn.Linear(in_dim, out_dim)
        self.lin_r = nn.Linear(in_dim, out_dim, bias=False)

    def forward(self, x: torch.Tensor, edge_index: torch.Tensor) -> torch.Tensor:
        """Forward pass.

        Args:
            x: Node features [N, in_dim]
            edge_index: Edge indices [2, E] (source, target)

        Returns:
            Updated node features [N, out_dim]
        """
        row, col = edge_index

        # Transform source and target features
        h_l = self.lin_l(x)  # [N, out_dim]
        h_r = self.lin_r(x)  # [N, out_dim]

        # Message passing: aggregate neighbor (source) features per target node
        msg = h_l[row]  # [E, out_dim] — features from source nodes
        agg = pyg_scatter(msg, col, dim=0, dim_size=x.size(0), reduce="mean")  # [N, out_dim]

        # Combine: mean-aggregated neighbor messages + self transformation
        out = agg + h_r
        return out


class TimeEncoder(nn.Module):
    """Encodes temporal information (time deltas) into a fixed-size vector.

    Maps scalar time deltas to a 16-dimensional embedding space.
    """

    def __init__(self, out_dim: int = 16):
        super().__init__()
        self.w = nn.Linear(1, out_dim)

    def forward(self, t: torch.Tensor) -> torch.Tensor:
        """Encode time deltas.

        Args:
            t: Time deltas [batch_size] or [batch_size, 1]

        Returns:
            Time embeddings [batch_size, out_dim]
        """
        if t.dim() == 1:
            t = t.unsqueeze(-1)
        return self.w(t)


class TCGLModel(nn.Module):
    """Temporal Contrastive Graph Learning model for flashcard scheduling.

    Takes a graph of vocabulary words connected by review history,
    encodes temporal patterns, and predicts optimal review intervals.

    The model outputs a scalar that can be interpreted as:
    - Recall probability for a given interval
    - Used to derive optimal next review time
    """

    def __init__(
        self,
        num_nodes: int = 78139,
        embed_dim: int = 16,
        time_dim: int = 16,
        node_feat_dim: int = 19,
        hidden_dim: int = 64,
        dropout: float = 0.3,
    ):
        super().__init__()
        self.embed_dim = embed_dim
        self.time_dim = time_dim
        self.node_feat_dim = node_feat_dim

        # Node embedding layer (pre-trained on 78,139 vocabulary items)
        self.node_embedding = nn.Embedding(num_nodes, embed_dim)

        # Temporal encoder
        self.time_encoder = TimeEncoder(time_dim)

        # Graph convolution layers
        conv_in = embed_dim + time_dim + node_feat_dim  # 16 + 16 + 19 = 51
        self.conv1 = CustomGraphConv(conv_in, hidden_dim)
        self.bn1 = nn.BatchNorm1d(hidden_dim)
        self.conv2 = CustomGraphConv(hidden_dim, hidden_dim)
        self.bn2 = nn.BatchNorm1d(hidden_dim)

        # Classification / regression head
        self.classifier = nn.Sequential(
            nn.Linear(hidden_dim, 32),
            nn.BatchNorm1d(32),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(32, 1),
        )

    def forward(
        self,
        x: torch.Tensor,
        edge_index: torch.Tensor,
        edge_time: torch.Tensor,
    ) -> torch.Tensor:
        """Forward pass through the TCGL model.

        Args:
            x: Node features [N, node_feat_dim] — per-word features like
               difficulty, part_of_speech encoding, review count, etc.
            edge_index: Graph edges [2, E] — (source, target) pairs
                        connecting related vocabulary or review sequences.
            edge_time: Time deltas for edges [E] — time since last review
                       or time between consecutive reviews.

        Returns:
            Predictions [N, 1] — recall probability or interval score per node.
        """
        # 1. Node embeddings
        node_ids = torch.arange(x.size(0), device=x.device)
        embed = self.node_embedding(node_ids)  # [N, 16]

        # 2. Time encoding per edge → aggregate per node
        time_enc = self.time_encoder(edge_time)  # [E, 16]

        # Aggregate time encodings to node level (mean of incoming edge times)
        row, col = edge_index
        node_time = pyg_scatter(
            time_enc, col, dim=0, dim_size=x.size(0), reduce="mean"
        )  # [N, 16]

        # For nodes with no incoming edges, use zero time encoding
        node_degrees = pyg_scatter(
            torch.ones(edge_time.size(0), device=x.device),
            col, dim=0, dim_size=x.size(0), reduce="sum"
        )
        no_edges_mask = node_degrees == 0
        node_time[no_edges_mask] = 0.0

        # 3. Concatenate: embedding + time + features
        h = torch.cat([embed, node_time, x], dim=1)  # [N, 51]

        # 4. Graph convolution layers with residual connections
        h = self.conv1(h, edge_index)
        h = self.bn1(h)
        h = torch.relu(h)

        h = self.conv2(h, edge_index)
        h = self.bn2(h)
        h = torch.relu(h)

        # 5. Classification head
        out = self.classifier(h)  # [N, 1]

        return out


def load_model(model_path: str, device: str = "cpu") -> TCGLModel:
    """Load a pre-trained TCGL model from a .pth file.

    Args:
        model_path: Path to the model.pth file
        device: Device to load the model on ('cpu' or 'cuda')

    Returns:
        Loaded TCGLModel in eval mode
    """
    model = TCGLModel()
    state_dict = torch.load(model_path, map_location=device, weights_only=False)
    model.load_state_dict(state_dict, strict=True)
    model.to(device)
    model.eval()
    return model
