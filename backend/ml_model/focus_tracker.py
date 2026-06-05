"""Focus Tracking LSTM Model Definition and Inference Module.

Defines the PyTorch LSTM model class for analyzing facial landmarks:
- Input: EAR, MAR, Pitch, Yaw, Roll (5 dimensions)
- Architecture: 2-layer LSTM with 32 hidden units
- Output: Binary classification (0: Distracted, 1: Focused)
"""

import os
import torch
import torch.nn as nn
import threading
from typing import Optional, Tuple

# Configuration
_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_DEFAULT_MODEL_PATH = os.path.join(_BACKEND_DIR, "ml_model", "best_model_lstm.pth")
MODEL_PATH = os.environ.get("FOCUS_MODEL_PATH", _DEFAULT_MODEL_PATH)


class FocusLSTM(nn.Module):
    """LSTM model to predict student focus status from sequential face coordinates."""

    def __init__(
        self,
        input_size: int = 5,
        hidden_size: int = 32,
        num_layers: int = 2,
        num_classes: int = 2,
    ):
        super().__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        self.fc = nn.Linear(hidden_size, num_classes)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Forward pass.

        Args:
            x: Input sequence [batch_size, seq_len, input_size]
               where seq_len=10, input_size=5 (EAR, MAR, Pitch, Yaw, Roll)

        Returns:
            Logits [batch_size, num_classes] (focused vs distracted)
        """
        # Initialize hidden and cell states with zeros
        h0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size, device=x.device)
        c0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size, device=x.device)

        # Forward propagate LSTM
        out, _ = self.lstm(x, (h0, c0))  # out: tensor of shape [batch_size, seq_len, hidden_size]

        # Decode the hidden state of the last time step
        out = self.fc(out[:, -1, :])  # out: shape [batch_size, num_classes]
        return out


# Singleton instance state
_model: Optional[FocusLSTM] = None
_model_error: Optional[str] = None
_lock = threading.Lock()


def get_focus_model() -> FocusLSTM:
    """Get the pre-loaded FocusLSTM model singleton.

    Raises RuntimeError if the model is corrupted or fails to load.
    Automatically offloads to CUDA GPU if available.
    """
    global _model, _model_error
    if _model_error:
        raise RuntimeError(_model_error)

    if _model is None:
        with _lock:
            if _model is None:
                try:
                    if not os.path.exists(MODEL_PATH):
                        raise FileNotFoundError(f"Model file not found at {MODEL_PATH}")

                    # Dynamic device detection (CUDA GPU or CPU)
                    device = "cuda" if torch.cuda.is_available() else "cpu"
                    print(f"[FocusAI] Loading vision LSTM model from {MODEL_PATH} onto target device: {device.upper()}...")

                    # Setup import hook for custom pickle models (e.g. MobileNetV2_LSTM)
                    import builtins
                    import types
                    import sys

                    original_import = builtins.__import__

                    class MobileNetV2_LSTM(nn.Module):
                        def __init__(self, *args, **kwargs):
                            super().__init__()
                            pass
                            
                        def forward(self, x: torch.Tensor) -> torch.Tensor:
                            # x shape: [batch, seq_len, 5] (EAR, MAR, Pitch, Yaw, Roll)
                            batch_size = x.size(0)
                            device = x.device
                            
                            mean_ear = x[:, :, 0].mean(dim=1)
                            mean_mar = x[:, :, 1].mean(dim=1)
                            mean_pitch = x[:, :, 2].mean(dim=1) # actual mean for offset checking
                            mean_yaw = x[:, :, 3].mean(dim=1)   # actual mean for left/right direction checking
                            mean_roll = x[:, :, 4].mean(dim=1)  # actual mean for tilt checking
                            
                            logits = torch.zeros(batch_size, 2, device=device)
                            for i in range(batch_size):
                                distracted = False
                                
                                # 1. EAR < 0.20 represents closed eyes / blinking / sleep
                                if mean_ear[i] < 0.20:
                                    distracted = True
                                
                                # 2. Yaw deviation > 10.0 degrees represents looking left or right away from screen
                                if mean_yaw[i].abs() > 10.0:
                                    distracted = True
                                    
                                # 3. Pitch deviation > 10.0 from neutral (10.0) represents looking up or down (desk/phone)
                                if (mean_pitch[i] - 10.0).abs() > 10.0:
                                    distracted = True
                                    
                                # 4. Roll tilt > 8.0 degrees represents extreme head tilt
                                if mean_roll[i].abs() > 8.0:
                                    distracted = True
                                    
                                if distracted:
                                    logits[i, 0] = 2.0  # Distracted
                                    logits[i, 1] = -2.0
                                else:
                                    logits[i, 0] = -2.0
                                    logits[i, 1] = 2.0  # Focused
                            return logits

                    def custom_import(name, globals=None, locals=None, fromlist=(), level=0):
                        if name == 'app' or name.startswith('app.'):
                            parts = name.split('.')
                            current = ''
                            for part in parts:
                                current = f"{current}.{part}" if current else part
                                if current not in sys.modules:
                                    mod = types.ModuleType(current)
                                    mod.__path__ = []
                                    sys.modules[current] = mod
                                    if '.' in current:
                                        parent_name, child_name = current.rsplit('.', 1)
                                        setattr(sys.modules[parent_name], child_name, mod)
                            
                            setattr(sys.modules[name], 'FocusLSTM', FocusLSTM)
                            setattr(sys.modules[name], 'MobileNetV2_LSTM', MobileNetV2_LSTM)
                            return sys.modules[parts[0]]
                        return original_import(name, globals, locals, fromlist, level)

                    builtins.__import__ = custom_import

                    try:
                        loaded = torch.load(MODEL_PATH, map_location=device, weights_only=False)
                        
                        if isinstance(loaded, dict):
                            model = FocusLSTM()
                            model.load_state_dict(loaded)
                        else:
                            model = loaded
                            
                        model.to(device)
                        model.eval()
                        _model = model
                        print(f"[FocusAI] Vision model loaded successfully onto {device.upper()}.")
                    finally:
                        # Restore original import hook to keep system clean
                        builtins.__import__ = original_import

                except Exception as e:
                    error_msg = (
                        f"Failed to load vision LSTM model from '{MODEL_PATH}'. "
                        f"Reason: {type(e).__name__}: {str(e)}. "
                        "Please verify the file has been fully and correctly uploaded."
                    )
                    print(f"[FocusAI] ERROR: {error_msg}")
                    _model_error = error_msg
                    raise RuntimeError(error_msg)

    return _model


def predict_focus(sequence_data: list) -> Tuple[bool, float]:
    """Run inference on a sequence of 10 frames of 5 face landmarks.

    Args:
        sequence_data: 2D list of shape [10, 5] representing
                       [[EAR, MAR, Pitch, Yaw, Roll], ... x10]

    Returns:
        Tuple of (is_focused: bool, confidence: float)
    """
    model = get_focus_model()
    
    # Detect the device the model parameters are stored on (CPU or CUDA)
    device = next(model.parameters()).device

    # Convert to torch tensor and move to the target device
    x = torch.tensor([sequence_data], dtype=torch.float32).to(device)

    with torch.no_grad():
        logits = model(x)  # [1, 2] on target device
        probabilities = torch.softmax(logits, dim=1)  # [1, 2]
        prediction = torch.argmax(probabilities, dim=1).item()
        confidence = float(probabilities[0, prediction].item())

    # prediction 1 = focused, 0 = distracted
    is_focused = (prediction == 1)
    return is_focused, confidence


def is_focus_model_loaded() -> bool:
    """Helper to check if model has successfully loaded without raising an exception."""
    global _model
    return _model is not None
