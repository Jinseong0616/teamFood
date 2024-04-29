// 1. 모듈 - require
const express = require('express')
const path = require('path')
const app = express()
const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')
const multer = require('multer')
const {Op} = require('sequelize')
const nodemailer = require("nodemailer");


const bcrypt = require('bcrypt')

// 이미지 디렉토리 설정
const uploadStore = multer({ dest: "uploads/store" }); // 스토어
const uploadUser = multer({ dest: "uploads/users" }); // 회원
const uploadReview = multer({ dest: "uploads/reviews" }); // 회원
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/test"); // 파일이 저장될 경로
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`); // 파일명 설정
  },
});
const upload = multer({ storage: storage });






// db
const db = require("./models");
const { User, Store, Restaurant, Image, Favorite, Review, region } = db;
// Store.hasMany(Image, { foreignKey: 'restaurantId' })
// Image.belongsTo(Store, { foreignKey: 'restaurantId' });
// 포트

const port = 3000;

// 2. use, set
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(express.static(__dirname + "/uploads"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. listen
app.listen(port, () => {
  console.log("접속 성공! - http://localhost:" + port);
});

app.use(passport.initialize());

app.use(
  session({
    secret: "1234",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60 * 60 * 1000 },
  })
);

app.use(passport.session());

passport.use(
  new LocalStrategy(async (username, pw, done) => {
    let result = await User.findOne({ where: { userId: username } });

    if (!result) {
      return done(null, false, { message: "ID가 DB에 없음" });

    } 
    if (await bcrypt.compare(pw, result.password)) {  // 같으면 true
      return done(null, result);
    }  
    else if (result.password != pw) {
      return done(null, false, { message: "비밀번호 불일치" });
    } 
  })
);

// 메인 페이지
app.get("/", async (req, res) => {
  const userId = req.isAuthenticated() ? req.user.userId : false;
  const user = await User.findOne({where : {userId}})

  if(user){
    res.render("index.ejs", { name : user.name , userId });
  }
  else {
    res.render('index.ejs', {userId})
  }
  
});

// 로그인페이지
app.get("/login", (req, res) => {
  res.render("loginPage.ejs");
});

//로그인
app.post("/login", (req, res) => {
  passport.authenticate("local", (error, user, info) => {
    if (error) return res.status(500).json(error); // 인증 과정에서 오류
    if (!user) return res.send("로그인 실패");

    req.logIn(user, (err) => {
      if (err) return next(err);
      req.session.userId = user.userId;
      return res.redirect("/");
    });
  })(req, res);
});

passport.serializeUser((user, done) => {
  process.nextTick(() => {
    // 세션 생성할 때 비밀번호가 들어가지 않음, user의  id와 이름만 알려주면 이 정보를 기록해주고
    // 유효기간은 cookie에 생성해준 기간으로 자동으로 생성해서 기록해줌.
    done(null, { userId: user.userId });
  });
});

passport.deserializeUser(async (user, done) => {
  try {
    let result = await User.findOne({ where: { userId: user.userId } });

    if (result) {
      // 사용자가 존재하고 비밀번호가 있는 경우에만 삭제
      if (result.password) {
        delete result.password; // 비밀번호 삭제
      }

      const newUserInfo = {
        userId: result.userId,
        // 필요한 경우 다른 필드도 추가할 수 있음
      };

      process.nextTick(() => {
        return done(null, newUserInfo);
      });
    } else {
      // 사용자를 찾을 수 없는 경우 빈 객체를 반환
      const newUserInfo = {};
      process.nextTick(() => {
        return done(null, newUserInfo);
      });
    }
  } catch (error) {
    console.error("처리중 오류 발생", error);
    done(error); // 오류가 발생한 경우 done 함수에 오류 전달
  }
});

// 로그아웃
app.get("/logout", (req, res) => {
  req.logout(() => {
    res.redirect("/");
  });
});

// 세부 페이지 (** *기능구현만 일단 해놓은 상태 ***)
app.get("/detail/:id", async (req, res) => {
  const userId = req.isAuthenticated() ? req.user.userId : false;

  try {
    const { id } = req.params;

    // 레스토랑 정보 가져오기
    const restaurant = await Store.findOne({ where: { restaurantId: id } });

    // 레스토랑에 대한 리뷰 가져오기
    const reviews = await Review.findAll({ where: { restaurantId: id } });

    const imgUrl = await Image.findAll({ where: { restaurantId: id } });

    const user = await User.findOne({ where: { userId: userId } });

    // 레스토랑 리뷰의 해당 유저의 사진 가져오기
    // const reviewPic = await Image.findOne({ where: { reviewId: id } });

    // 회원별로 작성한 리뷰에 대한 평균별점 계산
    const userRatings = {}; // 각 회원별 평균별점과 리뷰 개수를 저장할 객체

    reviews.forEach((review) => {
      if (!(review.userId in userRatings)) {
        userRatings[review.userId] = { totalRating: 0, reviewCount: 0 };
      }
      userRatings[review.userId].totalRating += review.rating;
      userRatings[review.userId].reviewCount++;
    });

    // 각 회원별 평균별점 계산
    const userAvgRatings = {};
    Object.keys(userRatings).forEach((userId) => {
      userAvgRatings[userId] = {
        avgRating:
          userRatings[userId].totalRating / userRatings[userId].reviewCount,
        reviewCount: userRatings[userId].reviewCount,
      };
    });
    console.log(user.name)
    res.render("detail.ejs", {
      restaurant,
      reviews,
      userAvgRatings,
      imgList: imgUrl,
      userId,
      name : user.name
    });
  } catch (error) {
    console.error("에러 발생:", error);
    res.status(500).send("서버 에러");
  }
});

// 회원가입 페이지
app.get("/join", async function (req, res) {
  res.render("joinPage.ejs");
});

// 회원가입
app.post("/join", uploadUser.single("imgUrl"), async function (req, res) {
  const newMember = req.body;
  const newFile = req.file;

  try {
    const member = await User.findOne({ where: { userId: newMember.userId } });

    if (member) {
      return res.send("중복입니다.");
    }

    let hashPassword = await bcrypt.hash(newMember.password, 10);

    newMember.password = hashPassword;

    const addMember = await User.create(newMember);
    
    if (newFile) {
      await Image.create({
        userId: addMember.userId,
        imgUrl: newFile.filename,
      });
    }
    res.redirect("/login");
  } catch (error) {
    console.log("검색 중 오류 발생", error);
    res.status(500).send("서버 오류 발생");
  }
});


// 리뷰페이지
app.get("/review/:restaurantId", async function (req, res) {
  const userId = req.isAuthenticated() ? req.user.userId : false;
  const {restaurantId} = req.params


  console.log(userId, restaurantId)
  res.render("review.ejs",{userId, restaurantId});
});


// 리뷰 작성
app.post('/review',uploadReview.array("imgUrl"), async function(req, res){
  const newReview = req.body
  const newFiles = req.files

  const addReview = await Review.create(newReview)

  console.log(addReview)

  if (newFiles) {
    for (const file of newFiles) {
      await Image.create({
        reviewId : addReview.reviewId,
        userId : addReview.userId,
        restaurantId: addReview.restaurantId,
        imgUrl: file.filename, // 여러 파일을 다루므로  newFile 대신 file 사용
      });
    }
  }
  res.redirect(`/detail/${newReview.restaurantId}`)

})


// 아이디 중복확인
app.post('/checkId', async(req, res)=>{
  const userId = req.body.userId
  console.log(userId)

  try {
    const existingMember = await User.findOne({ where: { userId: userId } });
      if (existingMember) {
          res.json({ exists: true }); 
      } else {
          res.json({ exists: false }); 
      }
  } catch (error) {
    console.log('검색 중 오류 발생', error)
    res.status(500).send("서버 오류 발생");
  }
})

// 마이페이지
app.get("/myPage/:id", async (req, res) => {
  const { id } = req.params;

  const member = await User.findOne({ where: { userId: id } }); // 회원 정보
  const memImg = await Image.findOne({ where: { userId: id } });
  
  res.render('myPage.ejs',{member,memImg})
})
  
// 회원 수정
app.put("/edit/:id", uploadUser.single("imgUrl"), async (req, res) => {
  const { id } = req.params;
  const newInfo = JSON.parse(req.body.data);

  const hashPassword = await bcrypt.hash(newInfo.password, 10)
  newInfo.password = hashPassword
  const newFile = req.file;

  const member = await User.findOne({ where: { userId: id } });
  let imgFile = await Image.findOne({ where: { userId: id } });

  if (member) {
    Object.keys(newInfo).forEach((prop) => {
      member[prop] = newInfo[prop];
    });
    await member.save();
    if(newFile){
      if (imgFile && member) {
        imgFile.imgUrl = newFile.filename;
        await imgFile.save();
      } else if(!imgFile && member) {
        await Image.create({
          userId: id,
          imgUrl: newFile.filename,
        });
      }
  }
    res.redirect("/");
  }
});

//지역 불러오기 API
app.get("/region", async (req, res) => {
  const selectedCity = req.query.city;
  
  // console.log(selectedCity)

  let guList;

  guList = await region.findAll({ where: { city: selectedCity } });

  // console.log(guList)

  res.json(guList)
})


// 검색 기능
app.get("/search", async function (req, res) {
  const userId = req.isAuthenticated() ? req.user.userId : false;

  const searchKeyword = req.query.keyword;
  const region = req.query.region;
  
  let shops;

  console.log("검색어는 ? ", searchKeyword);
  const user = await User.findOne({where : {userId}})
  
  try {
     if (region && searchKeyword) {
      // 가게 이름 또는 지역 카테고리에 검색어가 포함되어 있는 가게를 찾습니다.
      shops = await Store.findAll({
        where: {
          restaurantAddress: {
            [Op.like]: `%${region}%`
          },
          [Op.or]: [
            {
              restaurantName: {
                [Op.like]: `%${searchKeyword}%`
              }
            },
            {
              category: {
                [Op.like]: `%${searchKeyword}%`
              }
            }
          ]
        },
        include: [
          {
            model: Image,
            attributes: ["imgUrl"],
          },
        ]
      });
    }else if(searchKeyword){
      shops = await Store.findAll({
        where: {
          [Op.or]: [
            {
              restaurantName: {
                [Op.like]: `%${searchKeyword}%`,
              },
            },
            {
              category: {
                [Op.like]: `%${searchKeyword}%`,
              },
            },
            {
              restaurantAddress: {
                [Op.like]: `%${searchKeyword}%`,
              },
            },
          ],
        },
        include: [
          {
            model: Image,
            attributes: ["imgUrl"],
          },
        ],
      });
    }else {
      shops = await Store.findAll({
        include: [
          {
            model: Image,
            attributes: ["imgUrl"],
          },
        ],
      });
    }
    if(user){
      res.render("search.ejs", { shops, userId, name : user.name}); // 검색 결과를 클라이언트에게 전달합니다.
    }
    else {
      res.render("search.ejs", { shops, userId}); // 검색 결과를 클라이언트에게 전달합니다.
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "검색 실패" });
  }
});






// 음식점 추가하기
app.get("/add", async function (req, res) {
  res.render("shopAdd.ejs");
});

// 음식점 추가하기
app.post("/add", upload.array("imgUrl", 2), async function (req, res) {
  const newStore = req.body;

  // 파일 업로드
  const newFiles = req.files;
  console.log(newStore);

  // console.log(req.file.filename)  // multer를 통해 파일의 변경된 이름 가져옴 req.file.filename

  try {
    const existStore = await Store.findOne({
      where: { restaurantAddress: newStore.restaurantAddress},
    });

    // 파일 업로드가 성공적으로 이루어졌는지 확인
    if (existStore) {
      return res.status(400).send("이미 등록된 음식점입니다");
    }

    if (!newFiles || newFiles.length === 0) {
      return res.status(400).send("파일이 업로드되지 않았습니다.");
    }
    const addStore = await Store.create(newStore);

    if (addStore) {
      for (const file of newFiles) {
        await Image.create({
          restaurantId: addStore.restaurantId,
          imgUrl: file.filename, // 여러 파일을 다루므로  newFile 대신 file 사용
        });
      }
    }
    //res.status(200).send("등록 성공!");
    res.redirect("/");
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "음식점 등록 실패" });
  }
});

// 회원탈퇴
app.delete("/delete/:id", async function (req, res) {
  const id = req.params.id;
  console.log("아이디 : ", id);

  try {
    await User.destroy({ where: { userId: id } });
    console.log("잘처리됨");
    res.sendStatus(200);
  } catch (error) {
    console.error("처리중 오류 발생", error);
    res.status(500).send("서버 오류 발생");
  }
});




// 비밀번호 찾기
app.get("/findPassword/",(req,res)=>{
  res.render("findPassword.ejs")
})






app.get('/findEmail', (req,res)=>{
  res.render('findEmail.ejs')
})


let transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "ssorru0623@gmail.com",
    pass: "cgqc muyw arfv zzmp",   // 앱 비밀번호
  },
});

// 메세지를 보낼 이메일
const userEmail = 'ssorru0623@gmail.com'


app.post('/findEmail', (req,res)=>{
  const {userId} = req.body;
  console.log(userId)
  const resetCode = Math.random().toString(36).substring(2, 15); // 비밀번호 재설정 코드 생성

  bcrypt.hash(resetCode, 10, async function(err, hash) {
    if (err) {
      console.error('Hashing error:', err);
    } else {
      // DB에 해시화된 코드 저장 로직 (여기서는 생략)
      const user =  await User.findOne({where : {userId: userId}})

      if(user){
        console.log(user.password)
        user.password = hash;
        await user.save();
      }

      // 이메일로 비밀번호 초기화 코드 발송
      let mailOptions = {
        from: userEmail,
        to: userId,
        subject: '비밀번호 초기화 코드',
        text: `귀하의 비밀번호 초기화 코드는 ${resetCode} 입니다.`
      };
      console.log(mailOptions); // mailOptions 객체 로그 출력

      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
          res.status(500).send('이메일을 보내는 데 실패했습니다.');
        } else {
          console.log('Email sent: ' + info.response);
          res.redirect('/login')
        }
      });
    }
  });
})