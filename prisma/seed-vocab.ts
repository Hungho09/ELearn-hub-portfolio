/**
 * Seed script for English-Vietnamese vocabulary data.
 * Run with: bun run prisma/seed-vocab.ts
 */

import { db } from '@/lib/db';

const VOCABULARY_DATA = [
  // ─── Greetings & Basics ──────────────────────────────
  { english: "Hello", vietnamese: "Xin chào", partOfSpeech: "interjection", difficultyLevel: 1, category: "Greetings", exampleEnglish: "Hello, how are you?", exampleVietnamese: "Xin chào, bạn khỏe không?" },
  { english: "Goodbye", vietnamese: "Tạm biệt", partOfSpeech: "interjection", difficultyLevel: 1, category: "Greetings", exampleEnglish: "Goodbye, see you tomorrow!", exampleVietnamese: "Tạm biệt, hẹn gặp lại ngày mai!" },
  { english: "Thank you", vietnamese: "Cảm ơn", partOfSpeech: "phrase", difficultyLevel: 1, category: "Greetings", exampleEnglish: "Thank you very much!", exampleVietnamese: "Cảm ơn rất nhiều!" },
  { english: "Sorry", vietnamese: "Xin lỗi", partOfSpeech: "interjection", difficultyLevel: 1, category: "Greetings", exampleEnglish: "Sorry, I'm late.", exampleVietnamese: "Xin lỗi, tôi đến muộn." },
  { english: "Please", vietnamese: "Làm ơn", partOfSpeech: "adverb", difficultyLevel: 1, category: "Greetings", exampleEnglish: "Please sit down.", exampleVietnamese: "Làm ơn ngồi xuống." },
  { english: "Yes", vietnamese: "Có", partOfSpeech: "adverb", difficultyLevel: 1, category: "Greetings", exampleEnglish: "Yes, I agree.", exampleVietnamese: "Có, tôi đồng ý." },
  { english: "No", vietnamese: "Không", partOfSpeech: "adverb", difficultyLevel: 1, category: "Greetings", exampleEnglish: "No, thank you.", exampleVietnamese: "Không, cảm ơn." },
  { english: "Friend", vietnamese: "Bạn", partOfSpeech: "noun", difficultyLevel: 1, category: "Greetings", exampleEnglish: "She is my best friend.", exampleVietnamese: "Cô ấy là bạn thân nhất của tôi." },

  // ─── Food & Drinks ──────────────────────────────────
  { english: "Rice", vietnamese: "Cơm", partOfSpeech: "noun", difficultyLevel: 1, category: "Food & Drinks", exampleEnglish: "I eat rice every day.", exampleVietnamese: "Tôi ăn cơm mỗi ngày." },
  { english: "Water", vietnamese: "Nước", partOfSpeech: "noun", difficultyLevel: 1, category: "Food & Drinks", exampleEnglish: "Can I have some water?", exampleVietnamese: "Tôi có thể xin chút nước không?" },
  { english: "Coffee", vietnamese: "Cà phê", pronunciation: "ka-fe", partOfSpeech: "noun", difficultyLevel: 1, category: "Food & Drinks", exampleEnglish: "Vietnamese coffee is very strong.", exampleVietnamese: "Cà phê Việt Nam rất đậm." },
  { english: "Pho", vietnamese: "Phở", pronunciation: "fuh", partOfSpeech: "noun", difficultyLevel: 1, category: "Food & Drinks", exampleEnglish: "Pho is a traditional Vietnamese soup.", exampleVietnamese: "Phở là món súp truyền thống của Việt Nam." },
  { english: "Tea", vietnamese: "Trà", partOfSpeech: "noun", difficultyLevel: 1, category: "Food & Drinks", exampleEnglish: "Green tea is very healthy.", exampleVietnamese: "Trà xanh rất tốt cho sức khỏe." },
  { english: "Bread", vietnamese: "Bánh mì", partOfSpeech: "noun", difficultyLevel: 1, category: "Food & Drinks", exampleEnglish: "I bought some bread for breakfast.", exampleVietnamese: "Tôi đã mua bánh mì cho bữa sáng." },
  { english: "Fish", vietnamese: "Cá", partOfSpeech: "noun", difficultyLevel: 1, category: "Food & Drinks", exampleEnglish: "I like grilled fish.", exampleVietnamese: "Tôi thích cá nướng." },
  { english: "Sugar", vietnamese: "Đường", partOfSpeech: "noun", difficultyLevel: 1, category: "Food & Drinks", exampleEnglish: "No sugar in my coffee, please.", exampleVietnamese: "Không đường trong cà phê của tôi." },
  { english: "Vegetables", vietnamese: "Rau", partOfSpeech: "noun", difficultyLevel: 1, category: "Food & Drinks", exampleEnglish: "Eat more vegetables.", exampleVietnamese: "Ăn nhiều rau hơn." },
  { english: "Fruit", vietnamese: "Trái cây", partOfSpeech: "noun", difficultyLevel: 2, category: "Food & Drinks", exampleEnglish: "Tropical fruits are delicious.", exampleVietnamese: "Trái cây nhiệt đới rất ngon." },

  // ─── Numbers ─────────────────────────────────────────
  { english: "One", vietnamese: "Một", partOfSpeech: "number", difficultyLevel: 1, category: "Numbers", exampleEnglish: "I have one brother.", exampleVietnamese: "Tôi có một người anh." },
  { english: "Two", vietnamese: "Hai", partOfSpeech: "number", difficultyLevel: 1, category: "Numbers", exampleEnglish: "Two cups of tea, please.", exampleVietnamese: "Hai cốc trà, làm ơn." },
  { english: "Three", vietnamese: "Ba", partOfSpeech: "number", difficultyLevel: 1, category: "Numbers", exampleEnglish: "There are three cats.", exampleVietnamese: "Có ba con mèo." },
  { english: "Ten", vietnamese: "Mười", partOfSpeech: "number", difficultyLevel: 1, category: "Numbers", exampleEnglish: "Ten minutes left.", exampleVietnamese: "Còn mười phút." },
  { english: "Hundred", vietnamese: "Trăm", partOfSpeech: "number", difficultyLevel: 2, category: "Numbers", exampleEnglish: "One hundred dollars.", exampleVietnamese: "Một trăm đô la." },
  { english: "Thousand", vietnamese: "Nghìn", partOfSpeech: "number", difficultyLevel: 2, category: "Numbers", exampleEnglish: "A thousand thank yous.", exampleVietnamese: "Nghìn lời cảm ơn." },

  // ─── Colors ──────────────────────────────────────────
  { english: "Red", vietnamese: "Đỏ", partOfSpeech: "adjective", difficultyLevel: 1, category: "Colors", exampleEnglish: "She wore a red dress.", exampleVietnamese: "Cô ấy mặc váy đỏ." },
  { english: "Blue", vietnamese: "Xanh dương", partOfSpeech: "adjective", difficultyLevel: 1, category: "Colors", exampleEnglish: "The sky is blue.", exampleVietnamese: "Bầu trời màu xanh dương." },
  { english: "Green", vietnamese: "Xanh lá", partOfSpeech: "adjective", difficultyLevel: 1, category: "Colors", exampleEnglish: "The grass is green.", exampleVietnamese: "Cỏ màu xanh lá." },
  { english: "Yellow", vietnamese: "Vàng", partOfSpeech: "adjective", difficultyLevel: 1, category: "Colors", exampleEnglish: "The sun is yellow.", exampleVietnamese: "Mặt trời màu vàng." },
  { english: "White", vietnamese: "Trắng", partOfSpeech: "adjective", difficultyLevel: 1, category: "Colors", exampleEnglish: "The snow is white.", exampleVietnamese: "Tuyết màu trắng." },
  { english: "Black", vietnamese: "Đen", partOfSpeech: "adjective", difficultyLevel: 1, category: "Colors", exampleEnglish: "He has a black cat.", exampleVietnamese: "Anh ấy có một con mèo đen." },

  // ─── Family ──────────────────────────────────────────
  { english: "Mother", vietnamese: "Mẹ", partOfSpeech: "noun", difficultyLevel: 1, category: "Family", exampleEnglish: "My mother is a teacher.", exampleVietnamese: "Mẹ tôi là giáo viên." },
  { english: "Father", vietnamese: "Cha", partOfSpeech: "noun", difficultyLevel: 1, category: "Family", exampleEnglish: "My father works in a hospital.", exampleVietnamese: "Cha tôi làm việc ở bệnh viện." },
  { english: "Brother", vietnamese: "Anh em", partOfSpeech: "noun", difficultyLevel: 1, category: "Family", exampleEnglish: "I have two brothers.", exampleVietnamese: "Tôi có hai người anh em." },
  { english: "Sister", vietnamese: "Chị em", partOfSpeech: "noun", difficultyLevel: 1, category: "Family", exampleEnglish: "My sister is older than me.", exampleVietnamese: "Chị tôi lớn tuổi hơn tôi." },
  { english: "Grandmother", vietnamese: "Bà", partOfSpeech: "noun", difficultyLevel: 1, category: "Family", exampleEnglish: "My grandmother tells great stories.", exampleVietnamese: "Bà tôi kể chuyện rất hay." },
  { english: "Grandfather", vietnamese: "Ông", partOfSpeech: "noun", difficultyLevel: 1, category: "Family", exampleEnglish: "My grandfather is very wise.", exampleVietnamese: "Ông tôi rất uyên bác." },
  { english: "Child", vietnamese: "Đứa trẻ", partOfSpeech: "noun", difficultyLevel: 2, category: "Family", exampleEnglish: "The child is playing outside.", exampleVietnamese: "Đứa trẻ đang chơi ở ngoài." },
  { english: "Husband", vietnamese: "Chồng", partOfSpeech: "noun", difficultyLevel: 1, category: "Family", exampleEnglish: "Her husband is a doctor.", exampleVietnamese: "Chồng cô ấy là bác sĩ." },
  { english: "Wife", vietnamese: "Vợ", partOfSpeech: "noun", difficultyLevel: 1, category: "Family", exampleEnglish: "His wife is very kind.", exampleVietnamese: "Vợ anh ấy rất tốt." },

  // ─── Daily Activities ───────────────────────────────
  { english: "Eat", vietnamese: "Ăn", partOfSpeech: "verb", difficultyLevel: 1, category: "Daily Activities", exampleEnglish: "Let's eat lunch together.", exampleVietnamese: "Hãy ăn trưa cùng nhau." },
  { english: "Drink", vietnamese: "Uống", partOfSpeech: "verb", difficultyLevel: 1, category: "Daily Activities", exampleEnglish: "I drink water every morning.", exampleVietnamese: "Tôi uống nước mỗi sáng." },
  { english: "Sleep", vietnamese: "Ngủ", partOfSpeech: "verb", difficultyLevel: 1, category: "Daily Activities", exampleEnglish: "I sleep at 10 PM.", exampleVietnamese: "Tôi ngủ lúc 10 giờ tối." },
  { english: "Work", vietnamese: "Làm việc", partOfSpeech: "verb", difficultyLevel: 1, category: "Daily Activities", exampleEnglish: "I work from 9 to 5.", exampleVietnamese: "Tôi làm việc từ 9 giờ đến 5 giờ." },
  { english: "Study", vietnamese: "Học", partOfSpeech: "verb", difficultyLevel: 1, category: "Daily Activities", exampleEnglish: "I study English every day.", exampleVietnamese: "Tôi học tiếng Anh mỗi ngày." },
  { english: "Read", vietnamese: "Đọc", partOfSpeech: "verb", difficultyLevel: 1, category: "Daily Activities", exampleEnglish: "I like to read books.", exampleVietnamese: "Tôi thích đọc sách." },
  { english: "Write", vietnamese: "Viết", partOfSpeech: "verb", difficultyLevel: 1, category: "Daily Activities", exampleEnglish: "Please write your name.", exampleVietnamese: "Vui lòng viết tên của bạn." },
  { english: "Speak", vietnamese: "Nói", partOfSpeech: "verb", difficultyLevel: 1, category: "Daily Activities", exampleEnglish: "Can you speak slowly?", exampleVietnamese: "Bạn có thể nói chậm lại không?" },
  { english: "Listen", vietnamese: "Nghe", partOfSpeech: "verb", difficultyLevel: 1, category: "Daily Activities", exampleEnglish: "Listen carefully.", exampleVietnamese: "Hãy nghe cẩn thận." },
  { english: "Walk", vietnamese: "Đi bộ", partOfSpeech: "verb", difficultyLevel: 1, category: "Daily Activities", exampleEnglish: "I walk to school.", exampleVietnamese: "Tôi đi bộ đến trường." },

  // ─── Travel ──────────────────────────────────────────
  { english: "Airport", vietnamese: "Sân bay", partOfSpeech: "noun", difficultyLevel: 2, category: "Travel", exampleEnglish: "The airport is far from the city.", exampleVietnamese: "Sân bay cách xa thành phố." },
  { english: "Hotel", vietnamese: "Khách sạn", partOfSpeech: "noun", difficultyLevel: 1, category: "Travel", exampleEnglish: "We stayed at a nice hotel.", exampleVietnamese: "Chúng tôi ở tại một khách sạn đẹp." },
  { english: "Ticket", vietnamese: "Vé", partOfSpeech: "noun", difficultyLevel: 1, category: "Travel", exampleEnglish: "I need to buy a ticket.", exampleVietnamese: "Tôi cần mua vé." },
  { english: "Map", vietnamese: "Bản đồ", partOfSpeech: "noun", difficultyLevel: 1, category: "Travel", exampleEnglish: "Can you show me on the map?", exampleVietnamese: "Bạn có thể chỉ trên bản đồ cho tôi không?" },
  { english: "Train", vietnamese: "Tàu hỏa", partOfSpeech: "noun", difficultyLevel: 1, category: "Travel", exampleEnglish: "The train arrives at noon.", exampleVietnamese: "Tàu hỏa đến vào buổi trưa." },
  { english: "Bus", vietnamese: "Xe buýt", partOfSpeech: "noun", difficultyLevel: 1, category: "Travel", exampleEnglish: "I take the bus to work.", exampleVietnamese: "Tôi đi xe buýt đến chỗ làm." },

  // ─── Emotions ────────────────────────────────────────
  { english: "Happy", vietnamese: "Hạnh phúc", partOfSpeech: "adjective", difficultyLevel: 1, category: "Emotions", exampleEnglish: "I feel very happy today.", exampleVietnamese: "Hôm nay tôi cảm thấy rất hạnh phúc." },
  { english: "Sad", vietnamese: "Buồn", partOfSpeech: "adjective", difficultyLevel: 1, category: "Emotions", exampleEnglish: "Don't be sad.", exampleVietnamese: "Đừng buồn." },
  { english: "Angry", vietnamese: "Giận", partOfSpeech: "adjective", difficultyLevel: 1, category: "Emotions", exampleEnglish: "He was very angry.", exampleVietnamese: "Anh ấy đã rất giận." },
  { english: "Tired", vietnamese: "Mệt", partOfSpeech: "adjective", difficultyLevel: 1, category: "Emotions", exampleEnglish: "I'm so tired today.", exampleVietnamese: "Hôm nay tôi rất mệt." },
  { english: "Excited", vietnamese: "Hào hứng", partOfSpeech: "adjective", difficultyLevel: 2, category: "Emotions", exampleEnglish: "I'm excited about the trip!", exampleVietnamese: "Tôi rất hào hứng về chuyến đi!" },
  { english: "Afraid", vietnamese: "Sợ", partOfSpeech: "adjective", difficultyLevel: 1, category: "Emotions", exampleEnglish: "Don't be afraid.", exampleVietnamese: "Đừng sợ." },
  { english: "Love", vietnamese: "Yêu", partOfSpeech: "verb", difficultyLevel: 1, category: "Emotions", exampleEnglish: "I love you.", exampleVietnamese: "Tôi yêu bạn." },

  // ─── Time ────────────────────────────────────────────
  { english: "Today", vietnamese: "Hôm nay", partOfSpeech: "noun", difficultyLevel: 1, category: "Time", exampleEnglish: "What day is today?", exampleVietnamese: "Hôm nay là ngày mấy?" },
  { english: "Tomorrow", vietnamese: "Ngày mai", partOfSpeech: "noun", difficultyLevel: 1, category: "Time", exampleEnglish: "See you tomorrow!", exampleVietnamese: "Hẹn gặp lại ngày mai!" },
  { english: "Yesterday", vietnamese: "Hôm qua", partOfSpeech: "noun", difficultyLevel: 1, category: "Time", exampleEnglish: "Yesterday was a good day.", exampleVietnamese: "Hôm qua là một ngày tốt." },
  { english: "Morning", vietnamese: "Buổi sáng", partOfSpeech: "noun", difficultyLevel: 1, category: "Time", exampleEnglish: "Good morning!", exampleVietnamese: "Chào buổi sáng!" },
  { english: "Afternoon", vietnamese: "Buổi chiều", partOfSpeech: "noun", difficultyLevel: 1, category: "Time", exampleEnglish: "Good afternoon!", exampleVietnamese: "Chào buổi chiều!" },
  { english: "Evening", vietnamese: "Buổi tối", partOfSpeech: "noun", difficultyLevel: 1, category: "Time", exampleEnglish: "Good evening!", exampleVietnamese: "Chào buổi tối!" },
  { english: "Now", vietnamese: "Bây giờ", partOfSpeech: "adverb", difficultyLevel: 1, category: "Time", exampleEnglish: "Let's go now.", exampleVietnamese: "Đi ngay bây giờ." },
  { english: "Always", vietnamese: "Luôn luôn", partOfSpeech: "adverb", difficultyLevel: 2, category: "Time", exampleEnglish: "I always wake up early.", exampleVietnamese: "Tôi luôn luôn dậy sớm." },
  { english: "Never", vietnamese: "Không bao giờ", partOfSpeech: "adverb", difficultyLevel: 2, category: "Time", exampleEnglish: "I never give up.", exampleVietnamese: "Tôi không bao giờ bỏ cuộc." },

  // ─── Animals ─────────────────────────────────────────
  { english: "Dog", vietnamese: "Chó", partOfSpeech: "noun", difficultyLevel: 1, category: "Animals", exampleEnglish: "The dog is barking.", exampleVietnamese: "Con chó đang sủa." },
  { english: "Cat", vietnamese: "Mèo", partOfSpeech: "noun", difficultyLevel: 1, category: "Animals", exampleEnglish: "The cat is sleeping.", exampleVietnamese: "Con mèo đang ngủ." },
  { english: "Bird", vietnamese: "Chim", partOfSpeech: "noun", difficultyLevel: 1, category: "Animals", exampleEnglish: "The bird is singing.", exampleVietnamese: "Con chim đang hót." },
  { english: "Elephant", vietnamese: "Voi", partOfSpeech: "noun", difficultyLevel: 2, category: "Animals", exampleEnglish: "Elephants are very intelligent.", exampleVietnamese: "Voi rất thông minh." },
  { english: "Butterfly", vietnamese: "Con bướm", partOfSpeech: "noun", difficultyLevel: 2, category: "Animals", exampleEnglish: "The butterfly is beautiful.", exampleVietnamese: "Con bướm thật đẹp." },

  // ─── Weather ─────────────────────────────────────────
  { english: "Rain", vietnamese: "Mưa", partOfSpeech: "noun", difficultyLevel: 1, category: "Weather", exampleEnglish: "It's going to rain.", exampleVietnamese: "Sắp mưa rồi." },
  { english: "Sun", vietnamese: "Mặt trời", partOfSpeech: "noun", difficultyLevel: 1, category: "Weather", exampleEnglish: "The sun is shining.", exampleVietnamese: "Mặt trời đang chiếu sáng." },
  { english: "Wind", vietnamese: "Gió", partOfSpeech: "noun", difficultyLevel: 1, category: "Weather", exampleEnglish: "The wind is strong today.", exampleVietnamese: "Hôm nay gió mạnh." },
  { english: "Hot", vietnamese: "Nóng", partOfSpeech: "adjective", difficultyLevel: 1, category: "Weather", exampleEnglish: "It's very hot today.", exampleVietnamese: "Hôm nay rất nóng." },
  { english: "Cold", vietnamese: "Lạnh", partOfSpeech: "adjective", difficultyLevel: 1, category: "Weather", exampleEnglish: "It's cold in winter.", exampleVietnamese: "Mùa đông thì lạnh." },
  { english: "Storm", vietnamese: "Bão", partOfSpeech: "noun", difficultyLevel: 2, category: "Weather", exampleEnglish: "A storm is coming.", exampleVietnamese: "Bão sắp đến." },

  // ─── Education ───────────────────────────────────────
  { english: "School", vietnamese: "Trường học", partOfSpeech: "noun", difficultyLevel: 1, category: "Education", exampleEnglish: "I go to school every day.", exampleVietnamese: "Tôi đi học mỗi ngày." },
  { english: "Teacher", vietnamese: "Giáo viên", partOfSpeech: "noun", difficultyLevel: 1, category: "Education", exampleEnglish: "The teacher is very kind.", exampleVietnamese: "Giáo viên rất tốt." },
  { english: "Student", vietnamese: "Học sinh", partOfSpeech: "noun", difficultyLevel: 1, category: "Education", exampleEnglish: "She is a good student.", exampleVietnamese: "Cô ấy là học sinh giỏi." },
  { english: "Book", vietnamese: "Sách", partOfSpeech: "noun", difficultyLevel: 1, category: "Education", exampleEnglish: "This book is interesting.", exampleVietnamese: "Cuốn sách này thú vị." },
  { english: "Language", vietnamese: "Ngôn ngữ", partOfSpeech: "noun", difficultyLevel: 2, category: "Education", exampleEnglish: "Learning a new language is fun.", exampleVietnamese: "Học ngôn ngữ mới rất vui." },
  { english: "Question", vietnamese: "Câu hỏi", partOfSpeech: "noun", difficultyLevel: 2, category: "Education", exampleEnglish: "Do you have any questions?", exampleVietnamese: "Bạn có câu hỏi nào không?" },
  { english: "Answer", vietnamese: "Câu trả lời", partOfSpeech: "noun", difficultyLevel: 2, category: "Education", exampleEnglish: "What is the answer?", exampleVietnamese: "Câu trả lời là gì?" },
  { english: "Knowledge", vietnamese: "Kiến thức", partOfSpeech: "noun", difficultyLevel: 3, category: "Education", exampleEnglish: "Knowledge is power.", exampleVietnamese: "Kiến thức là sức mạnh." },

  // ─── Shopping ────────────────────────────────────────
  { english: "Money", vietnamese: "Tiền", partOfSpeech: "noun", difficultyLevel: 1, category: "Shopping", exampleEnglish: "I need to withdraw money.", exampleVietnamese: "Tôi cần rút tiền." },
  { english: "Price", vietnamese: "Giá", partOfSpeech: "noun", difficultyLevel: 1, category: "Shopping", exampleEnglish: "What is the price?", exampleVietnamese: "Giá bao nhiêu?" },
  { english: "Buy", vietnamese: "Mua", partOfSpeech: "verb", difficultyLevel: 1, category: "Shopping", exampleEnglish: "I want to buy this.", exampleVietnamese: "Tôi muốn mua cái này." },
  { english: "Sell", vietnamese: "Bán", partOfSpeech: "verb", difficultyLevel: 1, category: "Shopping", exampleEnglish: "They sell fresh fruit.", exampleVietnamese: "Họ bán trái cây tươi." },
  { english: "Expensive", vietnamese: "Đắt", partOfSpeech: "adjective", difficultyLevel: 1, category: "Shopping", exampleEnglish: "This is too expensive.", exampleVietnamese: "Cái này quá đắt." },
  { english: "Cheap", vietnamese: "Rẻ", partOfSpeech: "adjective", difficultyLevel: 1, category: "Shopping", exampleEnglish: "This is very cheap.", exampleVietnamese: "Cái này rất rẻ." },

  // ─── Body Parts ──────────────────────────────────────
  { english: "Head", vietnamese: "Đầu", partOfSpeech: "noun", difficultyLevel: 1, category: "Body Parts", exampleEnglish: "My head hurts.", exampleVietnamese: "Đầu tôi đau." },
  { english: "Hand", vietnamese: "Tay", partOfSpeech: "noun", difficultyLevel: 1, category: "Body Parts", exampleEnglish: "Raise your hand.", exampleVietnamese: "Giơ tay lên." },
  { english: "Eye", vietnamese: "Mắt", partOfSpeech: "noun", difficultyLevel: 1, category: "Body Parts", exampleEnglish: "She has beautiful eyes.", exampleVietnamese: "Cô ấy có đôi mắt đẹp." },
  { english: "Heart", vietnamese: "Trái tim", partOfSpeech: "noun", difficultyLevel: 1, category: "Body Parts", exampleEnglish: "My heart beats fast.", exampleVietnamese: "Trái tim tôi đập nhanh." },
  { english: "Mouth", vietnamese: "Miệng", partOfSpeech: "noun", difficultyLevel: 1, category: "Body Parts", exampleEnglish: "Open your mouth.", exampleVietnamese: "Há miệng ra." },

  // ─── Common Adjectives ──────────────────────────────
  { english: "Beautiful", vietnamese: "Đẹp", partOfSpeech: "adjective", difficultyLevel: 1, category: "Adjectives", exampleEnglish: "What a beautiful day!", exampleVietnamese: "Ngày hôm nay đẹp quá!" },
  { english: "Big", vietnamese: "To", partOfSpeech: "adjective", difficultyLevel: 1, category: "Adjectives", exampleEnglish: "That's a big house.", exampleVietnamese: "Đó là một ngôi nhà to." },
  { english: "Small", vietnamese: "Nhỏ", partOfSpeech: "adjective", difficultyLevel: 1, category: "Adjectives", exampleEnglish: "The room is small.", exampleVietnamese: "Căn phòng nhỏ." },
  { english: "Fast", vietnamese: "Nhanh", partOfSpeech: "adjective", difficultyLevel: 1, category: "Adjectives", exampleEnglish: "He runs very fast.", exampleVietnamese: "Anh ấy chạy rất nhanh." },
  { english: "Slow", vietnamese: "Chậm", partOfSpeech: "adjective", difficultyLevel: 1, category: "Adjectives", exampleEnglish: "Please speak slowly.", exampleVietnamese: "Xin nói chậm lại." },
  { english: "New", vietnamese: "Mới", partOfSpeech: "adjective", difficultyLevel: 1, category: "Adjectives", exampleEnglish: "I bought a new phone.", exampleVietnamese: "Tôi đã mua điện thoại mới." },
  { english: "Old", vietnamese: "Cũ", partOfSpeech: "adjective", difficultyLevel: 1, category: "Adjectives", exampleEnglish: "This is an old book.", exampleVietnamese: "Đây là một cuốn sách cũ." },
  { english: "Good", vietnamese: "Tốt", partOfSpeech: "adjective", difficultyLevel: 1, category: "Adjectives", exampleEnglish: "This is a good idea.", exampleVietnamese: "Đây là ý kiến tốt." },
  { english: "Bad", vietnamese: "Xấu", partOfSpeech: "adjective", difficultyLevel: 1, category: "Adjectives", exampleEnglish: "That was a bad decision.", exampleVietnamese: "Đó là một quyết định xấu." },

  // ─── Common Verbs ────────────────────────────────────
  { english: "Go", vietnamese: "Đi", partOfSpeech: "verb", difficultyLevel: 1, category: "Verbs", exampleEnglish: "Let's go!", exampleVietnamese: "Đi thôi!" },
  { english: "Come", vietnamese: "Đến", partOfSpeech: "verb", difficultyLevel: 1, category: "Verbs", exampleEnglish: "Come here, please.", exampleVietnamese: "Đến đây, làm ơn." },
  { english: "See", vietnamese: "Thấy", partOfSpeech: "verb", difficultyLevel: 1, category: "Verbs", exampleEnglish: "I can see the mountains.", exampleVietnamese: "Tôi có thể thấy những ngọn núi." },
  { english: "Know", vietnamese: "Biết", partOfSpeech: "verb", difficultyLevel: 1, category: "Verbs", exampleEnglish: "I know the answer.", exampleVietnamese: "Tôi biết câu trả lời." },
  { english: "Think", vietnamese: "Nghĩ", partOfSpeech: "verb", difficultyLevel: 1, category: "Verbs", exampleEnglish: "I think you're right.", exampleVietnamese: "Tôi nghĩ bạn đúng." },
  { english: "Want", vietnamese: "Muốn", partOfSpeech: "verb", difficultyLevel: 1, category: "Verbs", exampleEnglish: "I want to learn Vietnamese.", exampleVietnamese: "Tôi muốn học tiếng Việt." },
  { english: "Need", vietnamese: "Cần", partOfSpeech: "verb", difficultyLevel: 1, category: "Verbs", exampleEnglish: "I need help.", exampleVietnamese: "Tôi cần sự giúp đỡ." },
  { english: "Help", vietnamese: "Giúp", partOfSpeech: "verb", difficultyLevel: 1, category: "Verbs", exampleEnglish: "Can you help me?", exampleVietnamese: "Bạn có thể giúp tôi không?" },
  { english: "Try", vietnamese: "Thử", partOfSpeech: "verb", difficultyLevel: 1, category: "Verbs", exampleEnglish: "Try your best!", exampleVietnamese: "Hãy cố gắng hết sức!" },
  { english: "Remember", vietnamese: "Nhớ", partOfSpeech: "verb", difficultyLevel: 2, category: "Verbs", exampleEnglish: "Remember to study.", exampleVietnamese: "Nhớ phải học bài." },
  { english: "Forget", vietnamese: "Quên", partOfSpeech: "verb", difficultyLevel: 2, category: "Verbs", exampleEnglish: "Don't forget your keys.", exampleVietnamese: "Đừng quên chìa khóa." },
  { english: "Understand", vietnamese: "Hiểu", partOfSpeech: "verb", difficultyLevel: 2, category: "Verbs", exampleEnglish: "I understand now.", exampleVietnamese: "Bây giờ tôi hiểu rồi." },
];

async function main() {
  console.log('Seeding vocabulary data...');

  // Check if data already exists
  const existing = await db.vocabulary.count();
  if (existing > 0) {
    console.log(`Database already has ${existing} vocabulary items. Skipping seed.`);
    return;
  }

  // Insert vocabulary
  for (const item of VOCABULARY_DATA) {
    await db.vocabulary.create({ data: item });
  }

  console.log(`Successfully seeded ${VOCABULARY_DATA.length} vocabulary items.`);

  // Print category summary
  const categories: Record<string, number> = {};
  for (const item of VOCABULARY_DATA) {
    const cat = item.category || 'Uncategorized';
    categories[cat] = (categories[cat] || 0) + 1;
  }

  console.log('\nVocabulary by category:');
  for (const [cat, count] of Object.entries(categories).sort()) {
    console.log(`  ${cat}: ${count} words`);
  }
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
