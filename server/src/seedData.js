// Nội dung mẫu do chính dự án này soạn (không sao chép từ sách hay đề thi nào).
// Mỗi từ: [từ, IPA (Mỹ), loại từ, nghĩa, ví dụ]
// Mỗi tình huống: [chỉ số vật/NPC, từ, bối cảnh, câu hỏi, đáp án đúng, [sai1, sai2], giải thích]
// Đáp án đúng luôn viết đầu tiên; máy chủ xáo trộn khi gửi cho người chơi.
const W = (a) => a.map(([word, pronunciation, part_of_speech, meaning, example]) => ({ word, pronunciation, part_of_speech, meaning, example }));
const NPC = (name, emoji, line) => ({ kind: 'npc', name, emoji, line });
const OBJ = (name, emoji, line) => ({ kind: 'object', name, emoji, line });
const S = (item, word, context, question, right, wrong, explanation, hint = '') => ({
  item, word, context, question, explanation, hint,
  options: [{ text: right, correct: true }, ...wrong.map((text) => ({ text, correct: false }))],
});
const scene = (name, backdrop, description, items, situations) => ({ name, backdrop, description, items, situations });

export const WORLDS = [
  {
    name: 'At Home', topic: 'Daily life at home', emoji: '🏠', color: '#f59e0b',
    description: 'Start your day in the kitchen, bedroom, bathroom and at the front door.',
    vocabulary: W([
      ['kitchen', '/ˈkɪtʃɪn/', 'noun', 'nhà bếp', 'She is cooking dinner in the kitchen.'],
      ['hungry', '/ˈhʌŋɡri/', 'adjective', 'đói bụng', 'I am hungry. Let us eat lunch.'],
      ['cook', '/kʊk/', 'verb', 'nấu ăn', 'My father can cook very well.'],
      ['bedroom', '/ˈbedruːm/', 'noun', 'phòng ngủ', 'My bedroom has a small window.'],
      ['sleepy', '/ˈsliːpi/', 'adjective', 'buồn ngủ', 'I am sleepy after a long day.'],
      ['dirty', '/ˈdɜːrti/', 'adjective', 'bẩn', 'These socks are dirty.'],
      ['bathroom', '/ˈbæθruːm/', 'noun', 'phòng tắm', 'The bathroom is next to my bedroom.'],
      ['wash', '/wɑːʃ/', 'verb', 'rửa, giặt', 'Please wash your hands.'],
      ['clean', '/kliːn/', 'adjective', 'sạch sẽ', 'The towel is clean and soft.'],
      ['open', '/ˈoʊpən/', 'verb', 'mở', 'Can you open the door for me?'],
      ['lock', '/lɑːk/', 'verb', 'khóa', 'Do not forget to lock the door.'],
      ['thirsty', '/ˈθɜːrsti/', 'adjective', 'khát nước', 'I am thirsty. I need some water.'],
    ]),
    scenes: [
      scene('The Kitchen', '🍳', 'Morning smells of toast and eggs.', [
        NPC('Mom', '👩', 'Good morning! Breakfast is almost ready.'), OBJ('Fridge', '🧊', 'It is cold inside. There is milk and fruit.'), OBJ('Stove', '🔥', 'A pan is waiting on the stove.'),
      ], [
        S(0, 'kitchen', 'Mom calls from another room: "Where are you?" You are making toast next to the fridge and the stove.', 'What do you answer?', 'I am in the kitchen.', ['I am in the bedroom.', 'I am in the bathroom.'], 'Fridge + stove + toast = the kitchen (nhà bếp).'),
        S(1, 'hungry', 'Your stomach is making loud noises. You open the fridge to look for food.', 'How do you feel?', 'I am hungry.', ['I am sleepy.', 'I am dirty.'], 'Stomach noises and looking for food mean you are hungry (đói).'),
        S(2, 'cook', 'Mom is tired. There are eggs and a pan on the stove, and you know the recipe.', 'What do you offer?', 'I can cook the eggs.', ['I can lock the eggs.', 'I can open the eggs.'], 'To cook is to make food hot and ready to eat (nấu ăn).'),
      ]),
      scene('The Bedroom', '🛏️', 'A soft bed and a pile of clothes.', [
        NPC('Little Brother', '🧒', 'I want to play!'), OBJ('Bed', '🛏️', 'The blanket looks so warm.'), OBJ('Laundry basket', '🧺', 'It is full of clothes.'),
      ], [
        S(0, 'bedroom', 'Your brother asks where your bed and your books are. They are in the room where you sleep.', 'What do you say?', 'They are in my bedroom.', ['They are in the kitchen.', 'They are in the bathroom.'], 'The room where you sleep is the bedroom (phòng ngủ).'),
        S(1, 'sleepy', 'It is 11 p.m. Your eyes are closing and you keep yawning.', 'How do you feel?', 'I am sleepy.', ['I am thirsty.', 'I am hungry.'], 'Yawning and closing eyes mean sleepy (buồn ngủ).'),
        S(2, 'dirty', 'Your socks are brown after football in the mud.', 'What do you say about the socks?', 'They are dirty.', ['They are clean.', 'They are sleepy.'], 'Covered in mud means dirty (bẩn). The opposite is clean.'),
      ]),
      scene('The Bathroom', '🛁', 'Soap, water and a mirror.', [
        NPC('Dad', '👨', 'Dinner is soon. Get ready!'), OBJ('Sink', '🚰', 'Water drips from the tap.'), OBJ('Towel', '🧼', 'A soft towel on the hook.'),
      ], [
        S(0, 'bathroom', 'Dad asks where the soap and the shower are.', 'What do you answer?', 'They are in the bathroom.', ['They are in the bedroom.', 'They are in the kitchen.'], 'Shower + soap = bathroom (phòng tắm).'),
        S(1, 'wash', 'Your hands have paint on them. Dad says: "Dinner time!"', 'What do you do first?', 'I wash my hands.', ['I lock my hands.', 'I cook my hands.'], 'We wash with water and soap (rửa).'),
        S(2, 'clean', 'You take a towel from the shelf. It smells fresh and has no stains.', 'What do you say?', 'This towel is clean.', ['This towel is dirty.', 'This towel is hungry.'], 'No stains and a fresh smell = clean (sạch sẽ).'),
      ]),
      scene('The Front Door', '🚪', 'Someone is knocking.', [
        NPC('Neighbor', '🧔', 'Hello! Is anybody home?'), OBJ('Door', '🚪', 'A heavy wooden door.'), NPC('Cousin', '🧑', 'I ran all the way here.'),
      ], [
        S(1, 'open', 'The neighbor is knocking and you are on the inside of the closed door.', 'What do you do?', 'I open the door.', ['I lock the door.', 'I wash the door.'], 'To open means to let someone come in (mở).'),
        S(1, 'lock', 'You are leaving for the whole day. Nobody will stay at home.', 'What do you do before you go?', 'I lock the door.', ['I open the door.', 'I cook the door.'], 'We lock the door with a key to keep the house safe (khóa).'),
        S(2, 'thirsty', 'Your cousin ran to your house in the sun. He asks for a glass of cold water.', 'How does he feel?', 'He is thirsty.', ['He is sleepy.', 'He is clean.'], 'Wanting water means thirsty (khát nước).'),
      ]),
    ],
  },
  {
    name: 'At the Café', topic: 'Ordering food and drinks', emoji: '☕', color: '#b45309',
    description: 'Read the menu, order a drink, share a cake and pay the bill.',
    vocabulary: W([
      ['menu', '/ˈmenjuː/', 'noun', 'thực đơn', 'Can I see the menu, please?'],
      ['waiter', '/ˈweɪtər/', 'noun', 'người phục vụ (nam)', 'The waiter brings our drinks.'],
      ['hungry', '/ˈhʌŋɡri/', 'adjective', 'đói bụng', 'I am hungry. Let us eat lunch.'],
      ['order', '/ˈɔːrdər/', 'verb', 'gọi món', 'I would like to order a coffee.'],
      ['thirsty', '/ˈθɜːrsti/', 'adjective', 'khát nước', 'I am thirsty. I need some water.'],
      ['sweet', '/swiːt/', 'adjective', 'ngọt', 'This cake is very sweet.'],
      ['fresh', '/freʃ/', 'adjective', 'tươi', 'The juice is made from fresh oranges.'],
      ['delicious', '/dɪˈlɪʃəs/', 'adjective', 'ngon', 'The soup is delicious.'],
      ['share', '/ʃer/', 'verb', 'chia sẻ, dùng chung', 'Let us share this big pizza.'],
      ['bill', '/bɪl/', 'noun', 'hóa đơn', 'Could we have the bill, please?'],
      ['pay', '/peɪ/', 'verb', 'trả tiền', 'I will pay by card.'],
      ['tip', '/tɪp/', 'noun', 'tiền boa', 'We left a small tip for the waiter.'],
    ]),
    scenes: [
      scene('The Entrance', '🚪', 'A warm smell of coffee.', [
        NPC('Waiter', '🧑‍🍳', 'Welcome! Please sit anywhere.'), OBJ('Menu board', '📋', 'Coffee, tea, cake and sandwiches.'), NPC('Friend', '🧑', 'I skipped lunch today.'),
      ], [
        S(1, 'menu', 'You want to see the list of drinks and food with prices.', 'What do you ask for?', 'Can I see the menu, please?', ['Can I see the bill, please?', 'Can I see the tip, please?'], 'The menu is the list of food and drinks (thực đơn).'),
        S(0, 'waiter', 'A man in an apron walks to your table and carries a tray of drinks.', 'Who is he?', 'He is the waiter.', ['He is the menu.', 'He is the bill.'], 'The waiter serves food and drinks (người phục vụ).'),
        S(2, 'hungry', 'Your friend says he has not eaten since breakfast and his stomach is empty.', 'How does he feel?', 'He is hungry.', ['He is sweet.', 'He is fresh.'], 'Not eating + empty stomach = hungry (đói).'),
      ]),
      scene('The Counter', '☕', 'Bottles, cups and a big machine.', [
        NPC('Barista', '🧑‍🍳', 'What can I get you?'), OBJ('Coffee machine', '☕', 'It makes a loud noise.'), OBJ('Cake display', '🍰', 'Chocolate, cheese and strawberry cake.'),
      ], [
        S(0, 'order', 'The barista smiles and asks: "What would you like?" You want a latte.', 'What do you say?', 'I would like to order a latte.', ['I would like to tip a latte.', 'I would like to share a latte bill.'], 'To order is to ask for food or drink (gọi món).'),
        S(1, 'thirsty', 'It is a hot day and you really want a cold drink right now.', 'How do you feel?', 'I am thirsty.', ['I am fresh.', 'I am delicious.'], 'Wanting a drink = thirsty (khát nước).'),
        S(2, 'sweet', 'The strawberry cake has a lot of sugar. You take one bite and smile.', 'What do you say?', 'It is very sweet.', ['It is very waiter.', 'It is very menu.'], 'Sugar tastes sweet (ngọt).'),
      ]),
      scene('The Table', '🍽️', 'Your food arrives.', [
        NPC('Mai', '👩', 'This looks amazing!'), OBJ('Fruit juice', '🧃', 'Squeezed this morning.'), OBJ('Big pizza', '🍕', 'One pizza, two people.'),
      ], [
        S(1, 'fresh', 'The juice was squeezed from oranges just a few minutes ago.', 'What do you say about it?', 'The juice is fresh.', ['The juice is a bill.', 'The juice is a tip.'], 'Made a short time ago = fresh (tươi).'),
        S(0, 'delicious', 'Mai tastes the soup and says it tastes wonderful.', 'What does she say?', 'It is delicious!', ['It is the menu!', 'It is the bill!'], 'Tastes very good = delicious (ngon).'),
        S(2, 'share', 'You and your friend are both a little hungry, but the pizza is huge.', 'What do you suggest?', 'Let us share the pizza.', ['Let us tip the pizza.', 'Let us order the pizza bill.'], 'To share means to use something together (chia sẻ).'),
      ]),
      scene('The Cashier', '💳', 'Time to leave.', [
        NPC('Cashier', '🧑‍💼', 'Did you enjoy your meal?'), OBJ('Card machine', '💳', 'Beep beep.'), OBJ('Tip jar', '🫙', 'A small glass jar with some coins.'),
      ], [
        S(0, 'bill', 'You finish eating and you want the paper that shows how much to pay.', 'What do you ask for?', 'Could we have the bill, please?', ['Could we have the menu, please?', 'Could we have the tip, please?'], 'The bill shows the total price (hóa đơn).'),
        S(1, 'pay', 'The cashier shows the total. You take out your bank card.', 'What do you say?', 'I will pay by card.', ['I will share by card.', 'I will order by card.'], 'To pay is to give money for something (trả tiền).'),
        S(2, 'tip', 'The service was great. You put a few extra coins in the jar for the waiter.', 'What is the extra money called?', 'A tip.', ['A menu.', 'A bill.'], 'A tip is extra money for good service (tiền boa).'),
      ]),
    ],
  },
  {
    name: 'Shopping', topic: 'Buying and selling', emoji: '🛍️', color: '#ec4899',
    description: 'Walk through a shop: find the right size, ask the price and pay at the checkout.',
    vocabulary: W([
      ['basket', '/ˈbæskɪt/', 'noun', 'cái giỏ', 'Put the apples in the basket.'],
      ['sell', '/sel/', 'verb', 'bán', 'This shop sells fresh fruit.'],
      ['buy', '/baɪ/', 'verb', 'mua', 'I want to buy a new bag.'],
      ['size', '/saɪz/', 'noun', 'cỡ, kích cỡ', 'Do you have this shirt in a bigger size?'],
      ['price', '/praɪs/', 'noun', 'giá', 'What is the price of this shirt?'],
      ['expensive', '/ɪkˈspensɪv/', 'adjective', 'đắt', 'That watch is too expensive for me.'],
      ['cheap', '/tʃiːp/', 'adjective', 'rẻ', 'This hat is cheap.'],
      ['discount', '/ˈdɪskaʊnt/', 'noun', 'giảm giá', 'There is a ten percent discount today.'],
      ['return', '/rɪˈtɜːrn/', 'verb', 'trả lại (hàng)', 'I want to return these shoes.'],
      ['cashier', '/kæˈʃɪr/', 'noun', 'nhân viên thu ngân', 'The cashier gives me my change.'],
      ['pay', '/peɪ/', 'verb', 'trả tiền', 'I will pay by card.'],
      ['receipt', '/rɪˈsiːt/', 'noun', 'biên lai, hóa đơn mua hàng', 'Keep the receipt in case you need to return it.'],
    ]),
    scenes: [
      scene('The Entrance', '🛒', 'Baskets are stacked by the door.', [
        OBJ('Baskets', '🧺', 'Take one and start shopping.'), NPC('Shop owner', '🧑‍💼', 'We have everything you need!'), NPC('Customer', '🙋', 'I am looking for a gift.'),
      ], [
        S(0, 'basket', 'You want something to carry fruit and bread while you walk around the shop.', 'What do you take?', 'I take a basket.', ['I take a receipt.', 'I take a discount.'], 'A basket holds things while you shop (cái giỏ).'),
        S(1, 'sell', 'You ask the owner: "Do you have fresh bread?" He says yes, and it is on that shelf.', 'What does the owner say?', 'Yes, we sell bread.', ['Yes, we return bread.', 'Yes, we basket bread.'], 'A shop sells things to customers (bán).'),
        S(2, 'buy', 'The customer likes a red scarf and takes out her wallet.', 'What does she want to do?', 'She wants to buy the scarf.', ['She wants to sell the scarf.', 'She wants to return the scarf receipt.'], 'Customers buy; shops sell (mua).'),
      ]),
      scene('The Clothes Section', '👕', 'Shirts, jeans and jackets.', [
        NPC('Assistant', '🧑‍💼', 'May I help you?'), OBJ('Price tag', '🏷️', 'A small tag with a number.'), OBJ('Gold watch', '⌚', 'It shines under the light.'),
      ], [
        S(0, 'size', 'The jacket is too small. You ask for one that fits better. Medium? Large?', 'What do you ask?', 'Do you have a bigger size?', ['Do you have a bigger receipt?', 'Do you have a bigger basket price?'], 'Size means how big or small clothes are (cỡ).'),
        S(1, 'price', 'You want to know how much the shirt costs. You look at the small tag.', 'What do you ask?', 'What is the price?', ['What is the size?', 'What is the receipt?'], 'The price is how much money something costs (giá).'),
        S(2, 'expensive', 'The watch costs 50,000 dollars. You cannot buy it.', 'What do you say?', 'It is too expensive.', ['It is too cheap.', 'It is too basket.'], 'Costs a lot of money = expensive (đắt).'),
      ]),
      scene('The Sale Corner', '🏷️', 'Big red signs everywhere.', [
        OBJ('Sale sign', '🪧', 'Today only!'), NPC('Assistant', '🧑‍💼', 'Everything here is on sale.'), NPC('Unhappy customer', '😕', 'These shoes hurt my feet.'),
      ], [
        S(0, 'cheap', 'The T-shirt costs only one dollar. You are surprised and happy.', 'What do you say?', 'It is so cheap!', ['It is so expensive!', 'It is so receipt!'], 'Costs little money = cheap (rẻ).'),
        S(1, 'discount', 'The sign says "30% off today". The assistant tells you the lower price.', 'What is this?', 'It is a discount.', ['It is a basket.', 'It is a cashier.'], 'A discount is a lower price (giảm giá).'),
        S(2, 'return', 'The shoes hurt, so the customer brings them back to the shop to get her money back.', 'What does she want to do?', 'She wants to return the shoes.', ['She wants to sell the shoes.', 'She wants to discount the shoes.'], 'To return is to take something back to the shop (trả lại hàng).'),
      ]),
      scene('The Checkout', '💳', 'The queue is short.', [
        NPC('Cashier', '🧑‍💼', 'Hello! Did you find everything?'), OBJ('Card machine', '💳', 'Waiting for your card.'), OBJ('Paper slip', '🧾', 'It lists everything you bought.'),
      ], [
        S(0, 'cashier', 'A woman sits at the machine and scans your things. She tells you the total.', 'Who is she?', 'She is the cashier.', ['She is the basket.', 'She is the discount.'], 'The cashier takes your money at the checkout (thu ngân).'),
        S(1, 'pay', 'The cashier says the total is 20 dollars. You put your card on the machine.', 'What do you do?', 'I pay for my things.', ['I return for my things.', 'I sell for my things.'], 'To pay is to give money (trả tiền).'),
        S(2, 'receipt', 'You need a paper that proves you bought the shirt, in case it does not fit.', 'What do you ask for?', 'Can I have the receipt?', ['Can I have the cashier?', 'Can I have the size?'], 'A receipt is proof of purchase (biên lai).'),
      ]),
    ],
  },
  {
    name: 'School', topic: 'Life at school', emoji: '🏫', color: '#3b82f6',
    description: 'From the classroom to the exam: listen, ask, borrow and answer.',
    vocabulary: W([
      ['classroom', '/ˈklæsruːm/', 'noun', 'lớp học, phòng học', 'Our classroom is on the second floor.'],
      ['teacher', '/ˈtiːtʃər/', 'noun', 'giáo viên', 'My teacher is very kind.'],
      ['late', '/leɪt/', 'adjective', 'trễ, muộn', 'Sorry, I am late for class.'],
      ['lesson', '/ˈlesn/', 'noun', 'bài học', 'Today the lesson is about animals.'],
      ['listen', '/ˈlɪsn/', 'verb', 'lắng nghe', 'Please listen carefully.'],
      ['question', '/ˈkwestʃən/', 'noun', 'câu hỏi', 'I have a question about the lesson.'],
      ['notebook', '/ˈnoʊtbʊk/', 'noun', 'quyển vở', 'Write the new words in your notebook.'],
      ['borrow', '/ˈbɑːroʊ/', 'verb', 'mượn', 'Can I borrow your pen?'],
      ['forget', '/fərˈɡet/', 'verb', 'quên', 'Do not forget your notebook.'],
      ['homework', '/ˈhoʊmwɜːrk/', 'noun', 'bài tập về nhà', 'I finish my homework before dinner.'],
      ['exam', '/ɪɡˈzæm/', 'noun', 'kỳ thi', 'I have an exam tomorrow.'],
      ['answer', '/ˈænsər/', 'verb', 'trả lời', 'Who can answer this question?'],
    ]),
    scenes: [
      scene('The School Gate', '🏫', 'The bell is ringing!', [
        NPC('Teacher', '👩‍🏫', 'Hurry up, class has started.'), OBJ('Clock', '🕗', 'It is 8:15 and school started at 8:00.'), OBJ('Classroom door', '🚪', 'The room is on the first floor.'),
      ], [
        S(2, 'classroom', 'You are looking for the room where your English lesson is. The door says "Room 5".', 'What are you looking for?', 'My classroom.', ['My notebook exam.', 'My homework teacher.'], 'The classroom is the room where students study (lớp học).'),
        S(0, 'teacher', 'A woman stands in front of the board and teaches your English lesson.', 'Who is she?', 'She is my teacher.', ['She is my classroom.', 'She is my homework.'], 'A teacher teaches students (giáo viên).'),
        S(1, 'late', 'Class started at 8:00 but you arrive at 8:15.', 'What do you say?', 'Sorry, I am late.', ['Sorry, I am listening.', 'Sorry, I am borrowing.'], 'Not on time = late (trễ).'),
      ]),
      scene('The Lesson', '📖', 'Everybody is quiet.', [
        NPC('Teacher', '👩‍🏫', 'Today we learn about animals.'), NPC('Classmate', '🧒', 'I do not understand.'), OBJ('Board', '🟩', 'Big letters in white chalk.'),
      ], [
        S(0, 'lesson', 'The teacher writes "Animals" on the board and begins to explain it.', 'What is happening?', 'The lesson is starting.', ['The exam is paying.', 'The notebook is late.'], 'A lesson is a period of teaching (bài học).'),
        S(0, 'listen', 'The teacher is explaining something important. You do not talk. You use your ears.', 'What do you do?', 'I listen carefully.', ['I borrow carefully.', 'I forget carefully.'], 'To listen is to pay attention with your ears (lắng nghe).'),
        S(1, 'question', 'Your classmate does not understand and raises his hand to ask something.', 'What does he have?', 'He has a question.', ['He has an exam.', 'He has a classroom.'], 'A question is something you ask (câu hỏi).'),
      ]),
      scene('The Desk', '✏️', 'Pens, paper and bags.', [
        NPC('Deskmate', '🧑', 'Do you have a spare pen?'), OBJ('Your bag', '🎒', 'Books and pencils inside.'), OBJ('Notebook', '📒', 'Pages full of new words.'),
      ], [
        S(2, 'notebook', 'You want to write new words in a small book with lined pages.', 'What do you take out?', 'My notebook.', ['My lesson.', 'My question.'], 'A notebook is a book for writing notes (quyển vở).'),
        S(0, 'borrow', 'You have no pen today. Your deskmate has two. You want to use one and give it back later.', 'What do you ask?', 'Can I borrow a pen?', ['Can I forget a pen?', 'Can I answer a pen?'], 'To borrow is to use something and give it back (mượn).'),
        S(1, 'forget', 'You open your bag and your English book is not there. You left it at home.', 'What happened?', 'I forgot my book.', ['I listened my book.', 'I borrowed my book.'], 'To forget is to not remember (quên). Past: forgot.'),
      ]),
      scene('Test Day', '📝', 'Everyone is nervous.', [
        NPC('Teacher', '👩‍🏫', 'Good luck, everyone!'), OBJ('Test paper', '📄', 'Ten questions in total.'), OBJ('Homework folder', '📁', 'All finished and checked.'),
      ], [
        S(2, 'homework', 'You did your English exercises at home last night, and today you give them to the teacher.', 'What are you giving her?', 'My homework.', ['My exam.', 'My classroom.'], 'Homework is work you do at home (bài tập về nhà).'),
        S(1, 'exam', 'The teacher gives out test papers. You must work alone and nobody may talk.', 'What is it?', 'It is an exam.', ['It is a lesson.', 'It is a notebook.'], 'An exam is a test (kỳ thi).'),
        S(0, 'answer', 'The teacher asks: "What is the capital of France?" You know it is Paris.', 'What do you do?', 'I answer the question.', ['I borrow the question.', 'I forget the lesson late.'], 'To answer is to reply (trả lời).'),
      ]),
    ],
  },
  {
    name: 'Travel', topic: 'Airports and trips', emoji: '✈️', color: '#10b981',
    description: 'Buy a ticket, check in, wait at the gate and find your way when you arrive.',
    vocabulary: W([
      ['buy', '/baɪ/', 'verb', 'mua', 'I want to buy a ticket to Hue.'],
      ['price', '/praɪs/', 'noun', 'giá', 'What is the price of this ticket?'],
      ['ticket', '/ˈtɪkɪt/', 'noun', 'vé', 'I have a ticket to Hanoi.'],
      ['passport', '/ˈpæspɔːrt/', 'noun', 'hộ chiếu', 'Show your passport at the desk.'],
      ['luggage', '/ˈlʌɡɪdʒ/', 'noun', 'hành lý', 'My luggage is very heavy.'],
      ['flight', '/flaɪt/', 'noun', 'chuyến bay', 'Our flight leaves at nine.'],
      ['gate', '/ɡeɪt/', 'noun', 'cổng ra máy bay', 'Please go to gate twelve.'],
      ['delay', '/dɪˈleɪ/', 'noun', 'sự chậm trễ', 'There is a two-hour delay.'],
      ['sleepy', '/ˈsliːpi/', 'adjective', 'buồn ngủ', 'The baby is sleepy on the long flight.'],
      ['arrive', '/əˈraɪv/', 'verb', 'đến nơi', 'We arrive in Da Nang at noon.'],
      ['map', '/mæp/', 'noun', 'bản đồ', 'Look at the map to find the hotel.'],
      ['lost', '/lɔːst/', 'adjective', 'bị lạc', 'I am lost. Can you help me?'],
    ]),
    scenes: [
      scene('The Ticket Desk', '🎫', 'Screens show many cities.', [
        NPC('Ticket agent', '🧑‍💼', 'Where would you like to go?'), OBJ('Price board', '📊', 'Numbers and city names.'), OBJ('Printed ticket', '🎫', 'Your name is on it.'),
      ], [
        S(0, 'buy', 'You want to go to Hue by plane. You walk to the desk with your money.', 'What do you say?', 'I want to buy a ticket.', ['I want to arrive a ticket.', 'I want to lose a ticket flight.'], 'To buy is to get something with money (mua).'),
        S(1, 'price', 'You want to know how much the ticket to Hue costs.', 'What do you ask?', 'What is the price?', ['What is the gate?', 'What is the passport?'], 'Price = how much it costs (giá).'),
        S(2, 'ticket', 'The agent gives you a small paper that lets you get on the plane.', 'What is it?', 'It is a ticket.', ['It is a map.', 'It is a delay.'], 'A ticket lets you travel (vé).'),
      ]),
      scene('Check-in', '🧳', 'A long queue with big bags.', [
        NPC('Check-in officer', '🧑‍✈️', 'Passport, please.'), OBJ('Scale', '⚖️', 'It shows the weight of the bags.'), OBJ('Flight board', '🛫', 'FLIGHT 217 — DA NANG — 09:00'),
      ], [
        S(0, 'passport', 'The officer asks for a small book with your photo and your country name.', 'What do you give her?', 'My passport.', ['My luggage.', 'My gate.'], 'A passport is your travel document (hộ chiếu).'),
        S(1, 'luggage', 'You put your big suitcase and bag on the scale. They are heavy.', 'What are they?', 'They are my luggage.', ['They are my passport.', 'They are my flight.'], 'Luggage = bags and suitcases for a trip (hành lý).'),
        S(2, 'flight', 'The board says "217, Da Nang, 09:00". It is the plane trip you will take.', 'What is 217?', 'It is my flight.', ['It is my luggage.', 'It is my map.'], 'A flight is a trip by plane (chuyến bay).'),
      ]),
      scene('The Gate', '🛫', 'Seats, screens and announcements.', [
        OBJ('Gate sign', '🚪', 'GATE 12'), NPC('Announcer', '📢', 'Attention please!'), NPC('Traveler', '🧑‍🎒', 'My eyes are closing.'),
      ], [
        S(0, 'gate', 'Your boarding pass says "12". You walk to the door where passengers get on the plane.', 'Where are you going?', 'To gate twelve.', ['To ticket twelve.', 'To map twelve.'], 'The gate is where you board the plane (cổng).'),
        S(1, 'delay', 'The announcer says: "Flight 217 will leave two hours later than planned."', 'What is it?', 'It is a delay.', ['It is a passport.', 'It is a price.'], 'A delay is waiting longer than planned (sự chậm trễ).'),
        S(2, 'sleepy', 'The traveler has been awake all night. He yawns and rests his head on his bag.', 'How does he feel?', 'He is sleepy.', ['He is lost.', 'He is late luggage.'], 'Yawning means sleepy (buồn ngủ).'),
      ]),
      scene('The New City', '🏙️', 'Everything is new and busy.', [
        NPC('Taxi driver', '🧑‍✈️', 'Where to?'), OBJ('City map', '🗺️', 'Streets and small blue lines.'), NPC('Passer-by', '🙂', 'You look confused.'),
      ], [
        S(0, 'arrive', 'The plane lands in Da Nang at noon. You get off the plane.', 'What did you do?', 'I arrived in Da Nang.', ['I bought in Da Nang.', 'I delayed in Da Nang.'], 'To arrive is to reach a place (đến nơi).'),
        S(1, 'map', 'You want to find your hotel. You look at a paper that shows the streets.', 'What do you use?', 'I use a map.', ['I use a gate.', 'I use a ticket price.'], 'A map shows where places are (bản đồ).'),
        S(2, 'lost', 'You do not know where you are and you cannot find your hotel. You ask a stranger for help.', 'What do you say?', 'I am lost.', ['I am sleepy flight.', 'I am a passport.'], 'Lost = you do not know where you are (bị lạc).'),
      ]),
    ],
  },
];
