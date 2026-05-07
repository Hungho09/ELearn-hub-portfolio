"""Seed the database with initial English-Vietnamese vocabulary data.

Categories: Greetings, Food & Drinks, Numbers, Colors, Family, Daily Activities,
Travel, Emotions, Time, Body Parts, Animals, Weather, Education, Shopping,
Adjectives, Verbs
"""

from database import engine, SessionLocal
from models import Base, Vocabulary
from sqlalchemy.orm import Session


VOCABULARY_DATA = [
    # ─── Greetings & Basics ──────────────────────────────
    {"english": "Hello", "vietnamese": "Xin chào", "part_of_speech": "interjection", "difficulty_level": 1, "category": "Greetings",
     "example_english": "Hello, how are you?", "example_vietnamese": "Xin chào, bạn khỏe không?"},
    {"english": "Goodbye", "vietnamese": "Tạm biệt", "part_of_speech": "interjection", "difficulty_level": 1, "category": "Greetings",
     "example_english": "Goodbye, see you tomorrow!", "example_vietnamese": "Tạm biệt, hẹn gặp lại ngày mai!"},
    {"english": "Thank you", "vietnamese": "Cảm ơn", "part_of_speech": "phrase", "difficulty_level": 1, "category": "Greetings",
     "example_english": "Thank you very much!", "example_vietnamese": "Cảm ơn rất nhiều!"},
    {"english": "Sorry", "vietnamese": "Xin lỗi", "part_of_speech": "interjection", "difficulty_level": 1, "category": "Greetings",
     "example_english": "Sorry, I'm late.", "example_vietnamese": "Xin lỗi, tôi đến muộn."},
    {"english": "Please", "vietnamese": "Làm ơn", "part_of_speech": "adverb", "difficulty_level": 1, "category": "Greetings",
     "example_english": "Please sit down.", "example_vietnamese": "Làm ơn ngồi xuống."},
    {"english": "Yes", "vietnamese": "Có", "part_of_speech": "adverb", "difficulty_level": 1, "category": "Greetings",
     "example_english": "Yes, I agree.", "example_vietnamese": "Có, tôi đồng ý."},
    {"english": "No", "vietnamese": "Không", "part_of_speech": "adverb", "difficulty_level": 1, "category": "Greetings",
     "example_english": "No, thank you.", "example_vietnamese": "Không, cảm ơn."},
    {"english": "Friend", "vietnamese": "Bạn", "part_of_speech": "noun", "difficulty_level": 1, "category": "Greetings",
     "example_english": "She is my best friend.", "example_vietnamese": "Cô ấy là bạn thân nhất của tôi."},

    # ─── Food & Drinks ──────────────────────────────────
    {"english": "Rice", "vietnamese": "Cơm", "part_of_speech": "noun", "difficulty_level": 1, "category": "Food & Drinks",
     "example_english": "I eat rice every day.", "example_vietnamese": "Tôi ăn cơm mỗi ngày."},
    {"english": "Water", "vietnamese": "Nước", "part_of_speech": "noun", "difficulty_level": 1, "category": "Food & Drinks",
     "example_english": "Can I have some water?", "example_vietnamese": "Tôi có thể xin chút nước không?"},
    {"english": "Coffee", "vietnamese": "Cà phê", "pronunciation": "ka-fe", "part_of_speech": "noun", "difficulty_level": 1, "category": "Food & Drinks",
     "example_english": "Vietnamese coffee is very strong.", "example_vietnamese": "Cà phê Việt Nam rất đậm."},
    {"english": "Pho", "vietnamese": "Phở", "pronunciation": "fuh", "part_of_speech": "noun", "difficulty_level": 1, "category": "Food & Drinks",
     "example_english": "Pho is a traditional Vietnamese soup.", "example_vietnamese": "Phở là món súp truyền thống của Việt Nam."},
    {"english": "Tea", "vietnamese": "Trà", "part_of_speech": "noun", "difficulty_level": 1, "category": "Food & Drinks",
     "example_english": "Green tea is very healthy.", "example_vietnamese": "Trà xanh rất tốt cho sức khỏe."},
    {"english": "Bread", "vietnamese": "Bánh mì", "part_of_speech": "noun", "difficulty_level": 1, "category": "Food & Drinks",
     "example_english": "I bought some bread for breakfast.", "example_vietnamese": "Tôi đã mua bánh mì cho bữa sáng."},
    {"english": "Fish", "vietnamese": "Cá", "part_of_speech": "noun", "difficulty_level": 1, "category": "Food & Drinks",
     "example_english": "I like grilled fish.", "example_vietnamese": "Tôi thích cá nướng."},
    {"english": "Sugar", "vietnamese": "Đường", "part_of_speech": "noun", "difficulty_level": 1, "category": "Food & Drinks",
     "example_english": "No sugar in my coffee, please.", "example_vietnamese": "Không đường trong cà phê của tôi."},
    {"english": "Vegetables", "vietnamese": "Rau", "part_of_speech": "noun", "difficulty_level": 1, "category": "Food & Drinks",
     "example_english": "Eat more vegetables.", "example_vietnamese": "Ăn nhiều rau hơn."},
    {"english": "Fruit", "vietnamese": "Trái cây", "part_of_speech": "noun", "difficulty_level": 2, "category": "Food & Drinks",
     "example_english": "Tropical fruits are delicious.", "example_vietnamese": "Trái cây nhiệt đới rất ngon."},

    # ─── Numbers ─────────────────────────────────────────
    {"english": "One", "vietnamese": "Một", "part_of_speech": "number", "difficulty_level": 1, "category": "Numbers",
     "example_english": "I have one brother.", "example_vietnamese": "Tôi có một người anh."},
    {"english": "Two", "vietnamese": "Hai", "part_of_speech": "number", "difficulty_level": 1, "category": "Numbers",
     "example_english": "Two cups of tea, please.", "example_vietnamese": "Hai cốc trà, làm ơn."},
    {"english": "Three", "vietnamese": "Ba", "part_of_speech": "number", "difficulty_level": 1, "category": "Numbers",
     "example_english": "There are three cats.", "example_vietnamese": "Có ba con mèo."},
    {"english": "Ten", "vietnamese": "Mười", "part_of_speech": "number", "difficulty_level": 1, "category": "Numbers",
     "example_english": "Ten minutes left.", "example_vietnamese": "Còn mười phút."},
    {"english": "Hundred", "vietnamese": "Trăm", "part_of_speech": "number", "difficulty_level": 2, "category": "Numbers",
     "example_english": "One hundred dollars.", "example_vietnamese": "Một trăm đô la."},
    {"english": "Thousand", "vietnamese": "Nghìn", "part_of_speech": "number", "difficulty_level": 2, "category": "Numbers",
     "example_english": "A thousand thank yous.", "example_vietnamese": "Nghìn lời cảm ơn."},

    # ─── Colors ──────────────────────────────────────────
    {"english": "Red", "vietnamese": "Đỏ", "part_of_speech": "adjective", "difficulty_level": 1, "category": "Colors",
     "example_english": "She wore a red dress.", "example_vietnamese": "Cô ấy mặc váy đỏ."},
    {"english": "Blue", "vietnamese": "Xanh dương", "part_of_speech": "adjective", "difficulty_level": 1, "category": "Colors",
     "example_english": "The sky is blue.", "example_vietnamese": "Bầu trời màu xanh dương."},
    {"english": "Green", "vietnamese": "Xanh lá", "part_of_speech": "adjective", "difficulty_level": 1, "category": "Colors",
     "example_english": "The grass is green.", "example_vietnamese": "Cỏ màu xanh lá."},
    {"english": "Yellow", "vietnamese": "Vàng", "part_of_speech": "adjective", "difficulty_level": 1, "category": "Colors",
     "example_english": "The sun is yellow.", "example_vietnamese": "Mặt trời màu vàng."},
    {"english": "White", "vietnamese": "Trắng", "part_of_speech": "adjective", "difficulty_level": 1, "category": "Colors",
     "example_english": "The snow is white.", "example_vietnamese": "Tuyết màu trắng."},
    {"english": "Black", "vietnamese": "Đen", "part_of_speech": "adjective", "difficulty_level": 1, "category": "Colors",
     "example_english": "He has a black cat.", "example_vietnamese": "Anh ấy có một con mèo đen."},

    # ─── Family ──────────────────────────────────────────
    {"english": "Mother", "vietnamese": "Mẹ", "part_of_speech": "noun", "difficulty_level": 1, "category": "Family",
     "example_english": "My mother is a teacher.", "example_vietnamese": "Mẹ tôi là giáo viên."},
    {"english": "Father", "vietnamese": "Cha", "part_of_speech": "noun", "difficulty_level": 1, "category": "Family",
     "example_english": "My father works in a hospital.", "example_vietnamese": "Cha tôi làm việc ở bệnh viện."},
    {"english": "Brother", "vietnamese": "Anh em", "part_of_speech": "noun", "difficulty_level": 1, "category": "Family",
     "example_english": "I have two brothers.", "example_vietnamese": "Tôi có hai người anh em."},
    {"english": "Sister", "vietnamese": "Chị em", "part_of_speech": "noun", "difficulty_level": 1, "category": "Family",
     "example_english": "My sister is older than me.", "example_vietnamese": "Chị tôi lớn tuổi hơn tôi."},
    {"english": "Grandmother", "vietnamese": "Bà", "part_of_speech": "noun", "difficulty_level": 1, "category": "Family",
     "example_english": "My grandmother tells great stories.", "example_vietnamese": "Bà tôi kể chuyện rất hay."},
    {"english": "Grandfather", "vietnamese": "Ông", "part_of_speech": "noun", "difficulty_level": 1, "category": "Family",
     "example_english": "My grandfather is very wise.", "example_vietnamese": "Ông tôi rất uyên bác."},
    {"english": "Child", "vietnamese": "Đứa trẻ", "part_of_speech": "noun", "difficulty_level": 2, "category": "Family",
     "example_english": "The child is playing outside.", "example_vietnamese": "Đứa trẻ đang chơi ở ngoài."},
    {"english": "Husband", "vietnamese": "Chồng", "part_of_speech": "noun", "difficulty_level": 1, "category": "Family",
     "example_english": "Her husband is a doctor.", "example_vietnamese": "Chồng cô ấy là bác sĩ."},
    {"english": "Wife", "vietnamese": "Vợ", "part_of_speech": "noun", "difficulty_level": 1, "category": "Family",
     "example_english": "His wife is very kind.", "example_vietnamese": "Vợ anh ấy rất tốt."},

    # ─── Daily Activities ───────────────────────────────
    {"english": "Eat", "vietnamese": "Ăn", "part_of_speech": "verb", "difficulty_level": 1, "category": "Daily Activities",
     "example_english": "Let's eat lunch together.", "example_vietnamese": "Hãy ăn trưa cùng nhau."},
    {"english": "Drink", "vietnamese": "Uống", "part_of_speech": "verb", "difficulty_level": 1, "category": "Daily Activities",
     "example_english": "I drink water every morning.", "example_vietnamese": "Tôi uống nước mỗi sáng."},
    {"english": "Sleep", "vietnamese": "Ngủ", "part_of_speech": "verb", "difficulty_level": 1, "category": "Daily Activities",
     "example_english": "I sleep at 10 PM.", "example_vietnamese": "Tôi ngủ lúc 10 giờ tối."},
    {"english": "Work", "vietnamese": "Làm việc", "part_of_speech": "verb", "difficulty_level": 1, "category": "Daily Activities",
     "example_english": "I work from 9 to 5.", "example_vietnamese": "Tôi làm việc từ 9 giờ đến 5 giờ."},
    {"english": "Study", "vietnamese": "Học", "part_of_speech": "verb", "difficulty_level": 1, "category": "Daily Activities",
     "example_english": "I study English every day.", "example_vietnamese": "Tôi học tiếng Anh mỗi ngày."},
    {"english": "Read", "vietnamese": "Đọc", "part_of_speech": "verb", "difficulty_level": 1, "category": "Daily Activities",
     "example_english": "I like to read books.", "example_vietnamese": "Tôi thích đọc sách."},
    {"english": "Write", "vietnamese": "Viết", "part_of_speech": "verb", "difficulty_level": 1, "category": "Daily Activities",
     "example_english": "Please write your name.", "example_vietnamese": "Vui lòng viết tên của bạn."},
    {"english": "Speak", "vietnamese": "Nói", "part_of_speech": "verb", "difficulty_level": 1, "category": "Daily Activities",
     "example_english": "Can you speak slowly?", "example_vietnamese": "Bạn có thể nói chậm lại không?"},
    {"english": "Listen", "vietnamese": "Nghe", "part_of_speech": "verb", "difficulty_level": 1, "category": "Daily Activities",
     "example_english": "Listen carefully.", "example_vietnamese": "Hãy nghe cẩn thận."},
    {"english": "Walk", "vietnamese": "Đi bộ", "part_of_speech": "verb", "difficulty_level": 1, "category": "Daily Activities",
     "example_english": "I walk to school.", "example_vietnamese": "Tôi đi bộ đến trường."},

    # ─── Travel ──────────────────────────────────────────
    {"english": "Airport", "vietnamese": "Sân bay", "part_of_speech": "noun", "difficulty_level": 2, "category": "Travel",
     "example_english": "The airport is far from the city.", "example_vietnamese": "Sân bay cách xa thành phố."},
    {"english": "Hotel", "vietnamese": "Khách sạn", "part_of_speech": "noun", "difficulty_level": 1, "category": "Travel",
     "example_english": "We stayed at a nice hotel.", "example_vietnamese": "Chúng tôi ở tại một khách sạn đẹp."},
    {"english": "Ticket", "vietnamese": "Vé", "part_of_speech": "noun", "difficulty_level": 1, "category": "Travel",
     "example_english": "I need to buy a ticket.", "example_vietnamese": "Tôi cần mua vé."},
    {"english": "Map", "vietnamese": "Bản đồ", "part_of_speech": "noun", "difficulty_level": 1, "category": "Travel",
     "example_english": "Can you show me on the map?", "example_vietnamese": "Bạn có thể chỉ trên bản đồ cho tôi không?"},
    {"english": "Train", "vietnamese": "Tàu hỏa", "part_of_speech": "noun", "difficulty_level": 1, "category": "Travel",
     "example_english": "The train arrives at noon.", "example_vietnamese": "Tàu hỏa đến vào buổi trưa."},
    {"english": "Bus", "vietnamese": "Xe buýt", "part_of_speech": "noun", "difficulty_level": 1, "category": "Travel",
     "example_english": "I take the bus to work.", "example_vietnamese": "Tôi đi xe buýt đến chỗ làm."},

    # ─── Emotions ────────────────────────────────────────
    {"english": "Happy", "vietnamese": "Hạnh phúc", "part_of_speech": "adjective", "difficulty_level": 1, "category": "Emotions",
     "example_english": "I feel very happy today.", "example_vietnamese": "Hôm nay tôi cảm thấy rất hạnh phúc."},
    {"english": "Sad", "vietnamese": "Buồn", "part_of_speech": "adjective", "difficulty_level": 1, "category": "Emotions",
     "example_english": "Don't be sad.", "example_vietnamese": "Đừng buồn."},
    {"english": "Angry", "vietnamese": "Giận", "part_of_speech": "adjective", "difficulty_level": 1, "category": "Emotions",
     "example_english": "He was very angry.", "example_vietnamese": "Anh ấy đã rất giận."},
    {"english": "Tired", "vietnamese": "Mệt", "part_of_speech": "adjective", "difficulty_level": 1, "category": "Emotions",
     "example_english": "I'm so tired today.", "example_vietnamese": "Hôm nay tôi rất mệt."},
    {"english": "Excited", "vietnamese": "Hào hứng", "part_of_speech": "adjective", "difficulty_level": 2, "category": "Emotions",
     "example_english": "I'm excited about the trip!", "example_vietnamese": "Tôi rất hào hứng về chuyến đi!"},
    {"english": "Afraid", "vietnamese": "Sợ", "part_of_speech": "adjective", "difficulty_level": 1, "category": "Emotions",
     "example_english": "Don't be afraid.", "example_vietnamese": "Đừng sợ."},
    {"english": "Love", "vietnamese": "Yêu", "part_of_speech": "verb", "difficulty_level": 1, "category": "Emotions",
     "example_english": "I love you.", "example_vietnamese": "Tôi yêu bạn."},

    # ─── Time ────────────────────────────────────────────
    {"english": "Today", "vietnamese": "Hôm nay", "part_of_speech": "noun", "difficulty_level": 1, "category": "Time",
     "example_english": "What day is today?", "example_vietnamese": "Hôm nay là ngày mấy?"},
    {"english": "Tomorrow", "vietnamese": "Ngày mai", "part_of_speech": "noun", "difficulty_level": 1, "category": "Time",
     "example_english": "See you tomorrow!", "example_vietnamese": "Hẹn gặp lại ngày mai!"},
    {"english": "Yesterday", "vietnamese": "Hôm qua", "part_of_speech": "noun", "difficulty_level": 1, "category": "Time",
     "example_english": "Yesterday was a good day.", "example_vietnamese": "Hôm qua là một ngày tốt."},
    {"english": "Morning", "vietnamese": "Buổi sáng", "part_of_speech": "noun", "difficulty_level": 1, "category": "Time",
     "example_english": "Good morning!", "example_vietnamese": "Chào buổi sáng!"},
    {"english": "Afternoon", "vietnamese": "Buổi chiều", "part_of_speech": "noun", "difficulty_level": 1, "category": "Time",
     "example_english": "Good afternoon!", "example_vietnamese": "Chào buổi chiều!"},
    {"english": "Evening", "vietnamese": "Buổi tối", "part_of_speech": "noun", "difficulty_level": 1, "category": "Time",
     "example_english": "Good evening!", "example_vietnamese": "Chào buổi tối!"},
    {"english": "Now", "vietnamese": "Bây giờ", "part_of_speech": "adverb", "difficulty_level": 1, "category": "Time",
     "example_english": "Let's go now.", "example_vietnamese": "Đi ngay bây giờ."},
    {"english": "Always", "vietnamese": "Luôn luôn", "part_of_speech": "adverb", "difficulty_level": 2, "category": "Time",
     "example_english": "I always wake up early.", "example_vietnamese": "Tôi luôn luôn dậy sớm."},
    {"english": "Never", "vietnamese": "Không bao giờ", "part_of_speech": "adverb", "difficulty_level": 2, "category": "Time",
     "example_english": "I never give up.", "example_vietnamese": "Tôi không bao giờ bỏ cuộc."},

    # ─── Animals ─────────────────────────────────────────
    {"english": "Dog", "vietnamese": "Chó", "part_of_speech": "noun", "difficulty_level": 1, "category": "Animals",
     "example_english": "The dog is barking.", "example_vietnamese": "Con chó đang sủa."},
    {"english": "Cat", "vietnamese": "Mèo", "part_of_speech": "noun", "difficulty_level": 1, "category": "Animals",
     "example_english": "The cat is sleeping.", "example_vietnamese": "Con mèo đang ngủ."},
    {"english": "Bird", "vietnamese": "Chim", "part_of_speech": "noun", "difficulty_level": 1, "category": "Animals",
     "example_english": "The bird is singing.", "example_vietnamese": "Con chim đang hót."},
    {"english": "Fish", "vietnamese": "Cá", "part_of_speech": "noun", "difficulty_level": 1, "category": "Animals",
     "example_english": "The fish swims in the river.", "example_vietnamese": "Cá bơi trong sông."},
    {"english": "Elephant", "vietnamese": "Voi", "part_of_speech": "noun", "difficulty_level": 2, "category": "Animals",
     "example_english": "Elephants are very intelligent.", "example_vietnamese": "Voi rất thông minh."},
    {"english": "Butterfly", "vietnamese": "Con bướm", "part_of_speech": "noun", "difficulty_level": 2, "category": "Animals",
     "example_english": "The butterfly is beautiful.", "example_vietnamese": "Con bướm thật đẹp."},

    # ─── Weather ─────────────────────────────────────────
    {"english": "Rain", "vietnamese": "Mưa", "part_of_speech": "noun", "difficulty_level": 1, "category": "Weather",
     "example_english": "It's going to rain.", "example_vietnamese": "Sắp mưa rồi."},
    {"english": "Sun", "vietnamese": "Mặt trời", "part_of_speech": "noun", "difficulty_level": 1, "category": "Weather",
     "example_english": "The sun is shining.", "example_vietnamese": "Mặt trời đang chiếu sáng."},
    {"english": "Wind", "vietnamese": "Gió", "part_of_speech": "noun", "difficulty_level": 1, "category": "Weather",
     "example_english": "The wind is strong today.", "example_vietnamese": "Hôm nay gió mạnh."},
    {"english": "Hot", "vietnamese": "Nóng", "part_of_speech": "adjective", "difficulty_level": 1, "category": "Weather",
     "example_english": "It's very hot today.", "example_vietnamese": "Hôm nay rất nóng."},
    {"english": "Cold", "vietnamese": "Lạnh", "part_of_speech": "adjective", "difficulty_level": 1, "category": "Weather",
     "example_english": "It's cold in winter.", "example_vietnamese": "Mùa đông thì lạnh."},
    {"english": "Storm", "vietnamese": "Bão", "part_of_speech": "noun", "difficulty_level": 2, "category": "Weather",
     "example_english": "A storm is coming.", "example_vietnamese": "Bão sắp đến."},

    # ─── Education ───────────────────────────────────────
    {"english": "School", "vietnamese": "Trường học", "part_of_speech": "noun", "difficulty_level": 1, "category": "Education",
     "example_english": "I go to school every day.", "example_vietnamese": "Tôi đi học mỗi ngày."},
    {"english": "Teacher", "vietnamese": "Giáo viên", "part_of_speech": "noun", "difficulty_level": 1, "category": "Education",
     "example_english": "The teacher is very kind.", "example_vietnamese": "Giáo viên rất tốt."},
    {"english": "Student", "vietnamese": "Học sinh", "part_of_speech": "noun", "difficulty_level": 1, "category": "Education",
     "example_english": "She is a good student.", "example_vietnamese": "Cô ấy là học sinh giỏi."},
    {"english": "Book", "vietnamese": "Sách", "part_of_speech": "noun", "difficulty_level": 1, "category": "Education",
     "example_english": "This book is interesting.", "example_vietnamese": "Cuốn sách này thú vị."},
    {"english": "Language", "vietnamese": "Ngôn ngữ", "part_of_speech": "noun", "difficulty_level": 2, "category": "Education",
     "example_english": "Learning a new language is fun.", "example_vietnamese": "Học ngôn ngữ mới rất vui."},
    {"english": "Question", "vietnamese": "Câu hỏi", "part_of_speech": "noun", "difficulty_level": 2, "category": "Education",
     "example_english": "Do you have any questions?", "example_vietnamese": "Bạn có câu hỏi nào không?"},
    {"english": "Answer", "vietnamese": "Câu trả lời", "part_of_speech": "noun", "difficulty_level": 2, "category": "Education",
     "example_english": "What is the answer?", "example_vietnamese": "Câu trả lời là gì?"},
    {"english": "Knowledge", "vietnamese": "Kiến thức", "part_of_speech": "noun", "difficulty_level": 3, "category": "Education",
     "example_english": "Knowledge is power.", "example_vietnamese": "Kiến thức là sức mạnh."},

    # ─── Shopping ────────────────────────────────────────
    {"english": "Money", "vietnamese": "Tiền", "part_of_speech": "noun", "difficulty_level": 1, "category": "Shopping",
     "example_english": "I need to withdraw money.", "example_vietnamese": "Tôi cần rút tiền."},
    {"english": "Price", "vietnamese": "Giá", "part_of_speech": "noun", "difficulty_level": 1, "category": "Shopping",
     "example_english": "What is the price?", "example_vietnamese": "Giá bao nhiêu?"},
    {"english": "Buy", "vietnamese": "Mua", "part_of_speech": "verb", "difficulty_level": 1, "category": "Shopping",
     "example_english": "I want to buy this.", "example_vietnamese": "Tôi muốn mua cái này."},
    {"english": "Sell", "vietnamese": "Bán", "part_of_speech": "verb", "difficulty_level": 1, "category": "Shopping",
     "example_english": "They sell fresh fruit.", "example_vietnamese": "Họ bán trái cây tươi."},
    {"english": "Expensive", "vietnamese": "Đắt", "part_of_speech": "adjective", "difficulty_level": 1, "category": "Shopping",
     "example_english": "This is too expensive.", "example_vietnamese": "Cái này quá đắt."},
    {"english": "Cheap", "vietnamese": "Rẻ", "part_of_speech": "adjective", "difficulty_level": 1, "category": "Shopping",
     "example_english": "This is very cheap.", "example_vietnamese": "Cái này rất rẻ."},

    # ─── Body Parts ──────────────────────────────────────
    {"english": "Head", "vietnamese": "Đầu", "part_of_speech": "noun", "difficulty_level": 1, "category": "Body Parts",
     "example_english": "My head hurts.", "example_vietnamese": "Đầu tôi đau."},
    {"english": "Hand", "vietnamese": "Tay", "part_of_speech": "noun", "difficulty_level": 1, "category": "Body Parts",
     "example_english": "Raise your hand.", "example_vietnamese": "Giơ tay lên."},
    {"english": "Eye", "vietnamese": "Mắt", "part_of_speech": "noun", "difficulty_level": 1, "category": "Body Parts",
     "example_english": "She has beautiful eyes.", "example_vietnamese": "Cô ấy có đôi mắt đẹp."},
    {"english": "Heart", "vietnamese": "Trái tim", "part_of_speech": "noun", "difficulty_level": 1, "category": "Body Parts",
     "example_english": "My heart beats fast.", "example_vietnamese": "Trái tim tôi đập nhanh."},
    {"english": "Mouth", "vietnamese": "Miệng", "part_of_speech": "noun", "difficulty_level": 1, "category": "Body Parts",
     "example_english": "Open your mouth.", "example_vietnamese": "Há miệng ra."},

    # ─── Common Adjectives ──────────────────────────────
    {"english": "Beautiful", "vietnamese": "Đẹp", "part_of_speech": "adjective", "difficulty_level": 1, "category": "Adjectives",
     "example_english": "What a beautiful day!", "example_vietnamese": "Ngày hôm nay đẹp quá!"},
    {"english": "Big", "vietnamese": "To", "part_of_speech": "adjective", "difficulty_level": 1, "category": "Adjectives",
     "example_english": "That's a big house.", "example_vietnamese": "Đó là một ngôi nhà to."},
    {"english": "Small", "vietnamese": "Nhỏ", "part_of_speech": "adjective", "difficulty_level": 1, "category": "Adjectives",
     "example_english": "The room is small.", "example_vietnamese": "Căn phòng nhỏ."},
    {"english": "Fast", "vietnamese": "Nhanh", "part_of_speech": "adjective", "difficulty_level": 1, "category": "Adjectives",
     "example_english": "He runs very fast.", "example_vietnamese": "Anh ấy chạy rất nhanh."},
    {"english": "Slow", "vietnamese": "Chậm", "part_of_speech": "adjective", "difficulty_level": 1, "category": "Adjectives",
     "example_english": "Please speak slowly.", "example_vietnamese": "Xin nói chậm lại."},
    {"english": "New", "vietnamese": "Mới", "part_of_speech": "adjective", "difficulty_level": 1, "category": "Adjectives",
     "example_english": "I bought a new phone.", "example_vietnamese": "Tôi đã mua điện thoại mới."},
    {"english": "Old", "vietnamese": "Cũ", "part_of_speech": "adjective", "difficulty_level": 1, "category": "Adjectives",
     "example_english": "This is an old book.", "example_vietnamese": "Đây là một cuốn sách cũ."},
    {"english": "Good", "vietnamese": "Tốt", "part_of_speech": "adjective", "difficulty_level": 1, "category": "Adjectives",
     "example_english": "This is a good idea.", "example_vietnamese": "Đây là ý kiến tốt."},
    {"english": "Bad", "vietnamese": "Xấu", "part_of_speech": "adjective", "difficulty_level": 1, "category": "Adjectives",
     "example_english": "That was a bad decision.", "example_vietnamese": "Đó là một quyết định xấu."},

    # ─── Common Verbs ────────────────────────────────────
    {"english": "Go", "vietnamese": "Đi", "part_of_speech": "verb", "difficulty_level": 1, "category": "Verbs",
     "example_english": "Let's go!", "example_vietnamese": "Đi thôi!"},
    {"english": "Come", "vietnamese": "Đến", "part_of_speech": "verb", "difficulty_level": 1, "category": "Verbs",
     "example_english": "Come here, please.", "example_vietnamese": "Đến đây, làm ơn."},
    {"english": "See", "vietnamese": "Thấy", "part_of_speech": "verb", "difficulty_level": 1, "category": "Verbs",
     "example_english": "I can see the mountains.", "example_vietnamese": "Tôi có thể thấy những ngọn núi."},
    {"english": "Know", "vietnamese": "Biết", "part_of_speech": "verb", "difficulty_level": 1, "category": "Verbs",
     "example_english": "I know the answer.", "example_vietnamese": "Tôi biết câu trả lời."},
    {"english": "Think", "vietnamese": "Nghĩ", "part_of_speech": "verb", "difficulty_level": 1, "category": "Verbs",
     "example_english": "I think you're right.", "example_vietnamese": "Tôi nghĩ bạn đúng."},
    {"english": "Want", "vietnamese": "Muốn", "part_of_speech": "verb", "difficulty_level": 1, "category": "Verbs",
     "example_english": "I want to learn Vietnamese.", "example_vietnamese": "Tôi muốn học tiếng Việt."},
    {"english": "Need", "vietnamese": "Cần", "part_of_speech": "verb", "difficulty_level": 1, "category": "Verbs",
     "example_english": "I need help.", "example_vietnamese": "Tôi cần sự giúp đỡ."},
    {"english": "Help", "vietnamese": "Giúp", "part_of_speech": "verb", "difficulty_level": 1, "category": "Verbs",
     "example_english": "Can you help me?", "example_vietnamese": "Bạn có thể giúp tôi không?"},
    {"english": "Try", "vietnamese": "Thử", "part_of_speech": "verb", "difficulty_level": 1, "category": "Verbs",
     "example_english": "Try your best!", "example_vietnamese": "Hãy cố gắng hết sức!"},
    {"english": "Remember", "vietnamese": "Nhớ", "part_of_speech": "verb", "difficulty_level": 2, "category": "Verbs",
     "example_english": "Remember to study.", "example_vietnamese": "Nhớ phải học bài."},
    {"english": "Forget", "vietnamese": "Quên", "part_of_speech": "verb", "difficulty_level": 2, "category": "Verbs",
     "example_english": "Don't forget your keys.", "example_vietnamese": "Đừng quên chìa khóa."},
    {"english": "Understand", "vietnamese": "Hiểu", "part_of_speech": "verb", "difficulty_level": 2, "category": "Verbs",
     "example_english": "I understand now.", "example_vietnamese": "Bây giờ tôi hiểu rồi."},
]


def seed_database():
    """Create tables and seed vocabulary data."""
    # Create all tables
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Check if data already exists
        existing_count = db.query(Vocabulary).count()
        if existing_count > 0:
            print(f"Database already has {existing_count} vocabulary items. Skipping seed.")
            return

        # Insert vocabulary data
        for item in VOCABULARY_DATA:
            vocab = Vocabulary(**item)
            db.add(vocab)

        db.commit()
        print(f"Successfully seeded {len(VOCABULARY_DATA)} vocabulary items.")

        # Print category summary
        categories = {}
        for item in VOCABULARY_DATA:
            cat = item.get("category", "Uncategorized")
            categories[cat] = categories.get(cat, 0) + 1

        print("\nVocabulary by category:")
        for cat, count in sorted(categories.items()):
            print(f"  {cat}: {count} words")

    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
