// 1. 모듈 - require
const express = require('express')
const cors = require('cors')
const app = express()
const session = require('express-session')
const cookieParser = require('cookie-parser');
const passport = require('passport')
const LocalStrategy = require('passport-local')
const multer = require('multer')
const {Op, Sequelize} = require('sequelize')
const nodemailer = require("nodemailer");


const sequelize = new Sequelize('FOOD', 'foodMaster', 'korea1234', {
  dialect: 'mysql',
  host: 'teamfood.crsmg6yq43zm.us-east-2.rds.amazonaws.com'
});

const bcrypt = require('bcrypt')

// 이미지 디렉토리 설정
const uploadStore = multer({ dest: "uploads/store" }); // 스토어
const uploadUser = multer({ dest: "uploads/users" }); // 회원
const uploadReview = multer({ dest: "uploads/reviews" }); // 리뷰

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
const { User, Store, Image, Favorite, Review, region,Category, Complain, Response } = db;
// Store.hasMany(Image, { foreignKey: 'restaurantId' })
// Image.belongsTo(Store, { foreignKey: 'restaurantId' });
// 포트

const port = 9090;

// 2. use, set
app.set("view engine", "ejs");
app.use(cors());
app.use(express.static(__dirname + "/public"));
app.use(express.static(__dirname + "/uploads"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser())

// React
app.use(express.static('path/to/react-team/public'))
app.use(cors())

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

//메인페이지
app.get("/", async (req, res) => {
  const userId = req.isAuthenticated() ? req.user.userId : false;
    const categories = await Category.findAll()
  
    if(userId){
      const user = await User.findOne({where : {userId}})

      if(user){
        return res.json( { message : '사용자있음', name : user.name , userId, categories});
        }
      }
      res.json({message : '사용자없음', userId : false , categories})
});

// 로그인페이지
app.get("/login", (req, res) => {
  res.send("loginPage.ejs");
});

//로그인
app.post("/login", (req, res) => {
  passport.authenticate("local", (error, user, info) => {
    
    if (error) return res.status(500).json(error); // 인증 과정에서 오류
    if (!user) return res.status(401).json({ message: "로그인 실패" });
    console.log(error, user, info)
    req.logIn(user, (err) => {
      if (err) return next(err);
      req.session.userId = user.userId;
      req.session.name = user.name;

      console.log(user);
      const passwordCorrect = user.password
      return res.json({exists: true, passwordCorrect: passwordCorrect, userId : req.session.userId, name : req.session.name});

      
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

    // 레스토랑에 대한 전체 리뷰 가져오기
    const reviews = await Review.findAll({ where: { restaurantId: id } });

    // 레스토랑 사진
    const imgUrl = await Image.findAll({ where: { restaurantId: id } });

    // // 레스토랑 리뷰의 해당 유저의 사진 가져오기
    // const reviewPic = await Image.findOne({ where: { reviewId:  , restaurantId : id} });

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

  
    if(userId){
      const user = await User.findOne({ where: { userId: userId } });
      if(user){
        return res.json( {restaurant, reviews, userAvgRatings, imgList: imgUrl,userId, name : user.name, reviewPic});
      }
    }
    res.status(200).json({restaurant, reviews, userAvgRatings, imgList: imgUrl,userId : false})

    
   
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
      return res.json("중복입니다.");
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
    res.json({message : '성공'});
  } catch (error) {
    console.log("검색 중 오류 발생", error);
    res.status(500).send("서버 오류 발생");
  }
});


// 리뷰페이지
// app.get("/review/:restaurantId", async function (req, res) {
//   const userId = req.isAuthenticated() ? req.user.userId : false;
//   const {restaurantId} = req.params

//   res.render("review.ejs",{userId, restaurantId});
// });



// 마이 리뷰 페이지 디테일
app.get("/detailReview/:reviewId", async function (req, res) {
  const userId = req.isAuthenticated() ? req.user.userId : false;
  const {reviewId} = req.params

  const review = await Review.findOne({where : {reviewId : reviewId}})
  const restaurant = await Store.findOne({where : {restaurantId : review.restaurantId}})
  const img = await Image.findAll({where : {reviewId : reviewId}})

res.json({userId, review, restaurant, img});

});


// 리뷰 작성
app.post('/review',uploadReview.array("imgUrl", 10), async function(req, res){
  const newReview = req.body

  console.log(newReview)
  const newFiles = req.files

  console.log(newFiles)
  const addReview = await Review.create(newReview)

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
  // res.redirect(`/detail/${newReview.restaurantId}`)
  res.status(200).json({message : "등록 성공!"});

})


// 아이디 중복확인
app.post('/checkId', async(req, res)=>{
  const userId = req.body.userId

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
  if(id){
    const member = await User.findOne({ where: { userId: id } }); // 회원 정보
      const memImg = await Image.findOne({ where: 
        { 
          userId: id, 
          restaurantId : null, 
          reviewId : null } 
      });
      res.json({member, memImg})
    }
  else {
    res.json({error : '에러'})
  }
})
  
// 회원 수정
app.put("/edit/:id", uploadUser.single("imgUrl"), async (req, res) => {
  const { id } = req.params;
  const newInfo = JSON.parse(req.body.data);
  let member
  let imgFile
  console.log(newInfo)
  const newFile = req.file;
  if(id){
    member = await User.findOne({ where: { userId: id } });
    imgFile = await Image.findOne({ where: { userId: id } });
  }
  
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

  let guList;

  guList = await region.findAll({ where: { city: selectedCity } });

  res.json(guList)
})


// 검색 기능
app.get("/search", async function (req, res) {
  const userId = req.isAuthenticated() ? req.user.userId : false;
  const searchKeyword = req.query.keyword;
  const region = req.query.region;
  try {
    let shops;

    let query = `SELECT Stores.*, avg_reviews.avg_rating, avg_reviews.review_count, avg_reviews.content , Images.imgUrl
    FROM Stores
    LEFT OUTER JOIN (
        SELECT restaurantId, content, AVG(rating) AS avg_rating, COUNT(rating) AS review_count
        FROM Reviews
        GROUP BY restaurantId
    ) AS avg_reviews ON Stores.restaurantId = avg_reviews.restaurantId
    LEFT OUTER JOIN (
        SELECT restaurantId, imgUrl
        FROM Images
        WHERE (restaurantId, imgId) IN (
            SELECT restaurantId, MIN(imgId) AS imageId
            FROM Images
            GROUP BY restaurantId
        )
    ) AS Images ON Stores.restaurantId = Images.restaurantId`;


    if (region && searchKeyword) {
      query += ` WHERE Stores.restaurantAddress LIKE :region AND (Stores.restaurantName LIKE :keyword OR Stores.category LIKE :keyword)`;
    } else if (searchKeyword) {
      query += ` WHERE Stores.restaurantName LIKE :keyword OR Stores.category LIKE :keyword`;
    } else if (region) {
      query += ` WHERE Stores.restaurantAddress LIKE :region`;
    }

    shops = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT,
      replacements: {
        region: `%${region}%`,
        keyword: `%${searchKeyword}%`
      }
    });

    if (userId) {
      const user = await User.findOne({ where: { userId } });
      if (user) {
        return res.status(200).json({ shops, userId, name: user.name });
      }
    }
    res.status(200).json({ shops, userId: false });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "검색 실패" });
  }
});

// 조회수 증가
app.post('/increaseViews/:restaurantId', async (req, res) => {
  const { restaurantId } = req.params;

  try {
    const result = await Store.update(
      { views: sequelize.literal('views + 1') },
      { where: { restaurantId: restaurantId } }
    );

    if (result[0] === 1) {
      res.status(200).json({ message: '조회수가 증가되었습니다.' });
    } else {
      res.status(404).json({ message: '해당 식당을 찾을 수 없습니다.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '서버 오류로 조회수를 증가시키지 못했습니다.' });
  }
});


// 음식점 추가하기
app.get("/add", async function (req, res) {
  res.render("shopAdd.ejs");
});

// 음식점 추가하기
app.post("/add", upload.array("imgUrl", 2), async function (req, res) {
  const newStore = req.body;
  console.log(newStore)
  // 파일 업로드
  const newFiles = req.files;
  console.log(newFiles.filename)
  // multer를 통해 파일의 변경된 이름 가져옴 req.file.filename

  try {
    const existStore = await Store.findOne({
      where: { restaurantAddress: newStore.restaurantAddress},
    });

    // 파일 업로드가 성공적으로 이루어졌는지 확인
    if (existStore) {
      return res.status(400).send("이미 등록된 음식점입니다");
    }

    if (!newFiles || newFiles.length === 0) {
      return res.status(400).json({ error: "음식점 사진이 업로드되지 않았습니다. 사진을 첨부해주세요." });
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
    res.status(200).json({message : "등록 성공!"});
    // res.redirect("/");
//res.json({message : '성공'});
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "음식점 등록 실패" });
  }
});


// 회원탈퇴
app.delete("/delete/:id", async function (req, res) {
  const {id} = req.params;
  console.log("아이디 : ", id);

  if(!id){
    return res.status(400).send("ID 가 제공되지 않았습니다.");
  }

  try {
    const deleted = await User.destroy({ where: { userId: id } });
    await Image.destroy({where : {userId : id}})
    console.log('deleted 인가요?',deleted);
    if(deleted > 0){
      res.json({data : '회원 탈퇴 성공'});
    } else {
      res.status(404).send("해당 ID를 가진 사용자를 찾을 수 없습니다.");
    }
    
  } catch (error) {
    console.error("처리중 오류 발생", error);
    res.status(500).send("서버 오류 발생");
  }
});



// 비밀번호 찾기
app.get("/findPassword/",(req,res)=>{
  res.render("findPassword.ejs")
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


app.post('/findEmail', async (req,res)=>{
  const {userId} = req.body;
  console.log(userId)
  const resetCode = Math.random().toString(36).substring(2, 15); // 비밀번호 재설정 코드 생성

  const user =  await User.findOne({where : {userId: userId}})
  if(user){
  bcrypt.hash(resetCode, 10, async function(err, hash) {
    if (err) {
      console.error('Hashing error:', err);
    } else {
      // DB에 해시화된 코드 저장 로직 (여기서는 생략)
        console.log(user.password)
        user.password = hash;
        await user.save();

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
          res.json({message : '이메일 성공'})
        }
      });
    }
  });
}
else {
  res.json()
}

})

//날짜 변환
const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};


//내가 쓴 리뷰 페이지

app.get('/myReview/:id', async(req, res)=>{
  const id = req.params.id
  const myReviews = await Review.findAll({ where: { userId: id } });
  // for(let i = 0; i < myReviews.length; i++){
  //   console.log('리뷰 아이디: ', myReviews[i].dataValues.reviewId);
  // }

  const reviewIds = myReviews.map(review => review.dataValues.reviewId);
  const reviewres = myReviews.map(review => review.dataValues.restaurantId);
  
  const myReviewsImg = await Image.findAll({ where: { reviewId: reviewIds } });

  const restaurantName = await Store.findAll({where : {restaurantId : reviewres}})
  res.json({myReviews, formatDate, myReviewsImg, restaurantName})
})


// 내가 쓴 리뷰 수정
app.get('/myReviewEdit/reviewId', async (req, res)=>{
  const {reviewId} = req.params;
  console.log(reviewId)

  if(reviewId){
    const review = await Review.findOne({where : {reviewId : reviewId}}); // 리뷰 정보
    const reviewImg = await Image.findAll({where : {reviewId : reviewId}})
    res.json({review, reviewImg})
  } else{
    res.json({error : '에러러'})
  }

})


// 비밀번호 변경 페이지
app.get('/editPw/:id', async (req,res)=>{
  const {id} = req.params
  const member = await User.findOne({where : {userId : id}})
  res.render('editPassword.ejs', {member})
})

// 비밀번호 변경
app.put('/editPw/:id', async (req,res)=>{

  const {id} = req.params
  const newInfo = req.body.password
  const member = await User.findOne({where : {userId : id}})
  const hashPassword = await bcrypt.hash(newInfo, 10)
  member.password = hashPassword
  await member.save()

  res.json({ message: "비밀번호가 성공적으로 변경되었습니다." })

})


app.get("/", async (req, res) => {
    const userId = req.isAuthenticated() ? req.user.userId : false;
    const categories = await Category.findAll()
  
    if(userId){
      const user = await User.findOne({where : {userId}})

      if(user){
        return res.json( { message : '사용자있음', name : user.name , userId, categories});
        }
      }
      res.json({message : '사용자없음', userId : false , categories})
  });


app.delete('/deleteReview/:reviewId', async (req,res)=>{
  const {reviewId} = req.body;
  console.log(reviewId)
  if(!reviewId){
    return res.status(400).send("ID 가 제공되지 않았습니다.");
  }
  
  try{
    const deleted = await Review.destroy({where : {reviewId : reviewId}})
    await Image.destroy({where: {reviewId: reviewId}})
    if(deleted > 0){
      res.json({data : '리뷰 삭제 성공'});
    } else {
      res.status(404).send("리뷰 삭제 실패");
    }
  }
  catch(err){
    console.error("처리중 오류 발생", error);
    res.status(500).send("서버 오류 발생");
  }
})

app.put('/editReview/:reviewId', uploadReview.array("imgUrl", 10), async(req, res) => {
  const { reviewId } = req.params;
  console.log(reviewId)
  const newInfo = JSON.parse(req.body.data);
  const newFiles = req.files;

  console.log('정보들 : ', newInfo);
  // console.log('삭제할 이미지 : ' , deletedImages)
  console.log('이미지 파일 : ', newFiles)

  const review = await Review.findOne({ where: { reviewId: reviewId } });
  if (!review) {
    return res.status(404).send('리뷰를 찾을 수 없습니다.');
  }
  
  Object.keys(newInfo).forEach((prop) => {
    review[prop] = newInfo[prop];
  });
  await review.save();

 if(newInfo.deletedImages && newInfo.deletedImages.length > 0){
  for(let deleteFile of newInfo.deletedImages){
    console.log(deleteFile)
    await Image.destroy({where : {imgUrl : deleteFile}})
  }

  // 삭제 파일과 새로운 파일이 같이 존재할 때
  if (newFiles && newFiles.length > 0) {
    // 새 이미지 파일 정보 저장
    for (let file of newFiles) {
      await Image.create({
        userId : newInfo.userId,
        reviewId: reviewId,
        restaurantId: newInfo.restaurantId,
        imgUrl: file.filename  
      });
    }
  }
 }

  // 삭제 파일은 없고 새로운 파일만 존재할 때
  else if (newFiles && newFiles.length > 0) {
    // 새 이미지 파일 정보 저장
    for (let file of newFiles) {
      await Image.create({
        userId : newInfo.userId,
        reviewId: reviewId,
        restaurantId: newInfo.restaurantId,
        imgUrl: file.filename  
      });
    }
  }
  res.send('리뷰가 성공적으로 업데이트 되었습니다.');
});

//찜하기 조회 API
app.get('/zzim/users/:userId/restaurantId/:restaurantId',async(req,res)=>{
  const {userId,restaurantId} = req.params;

  const zzim = await Favorite.findOne({
    where :{
      userId : userId,
      restaurantId : restaurantId
    }
  })

  if (zzim) {
    res.json({ zzim: true });
  } else {
    res.json({ zzim: false });
  }

})


//찜 하기
app.post('/zzim/users/:userId/restaurantId/:restaurantId',async(req,res)=>{
  const {userId,restaurantId} = req.params;

  try {
    const zzim = await Favorite.create({
      userId,
      restaurantId
    })
    res.json(zzim)  
  } catch (error) {
    res.status(500).json({error : "찜 등록 실패"})
  }

})


//찜 삭제
app.delete('/zzim/users/:userId/restaurantId/:restaurantId',async(req,res)=>{
  const {userId,restaurantId} = req.params;
  console.log('삭제 안됨?', userId, restaurantId)
  try {
    await Favorite.destroy(
      {where:{
        userId,
        restaurantId
      }}
    )
    res.json("찜 목록 삭제됨")  
  } catch (error) {
    res.status(500).json({error : "찜 삭제 실패"})
  }
})


// 찜 목록
app.get('/zzimList/users/:userId', async(req, res)=>{
  const userId = req.params.userId;
  console.log('찜  유저아이디',userId)
  try {
  
    const myFavorites = await Favorite.findAll({where : {userId : userId}})
    console.log('내가 찜한거 : ', myFavorites)
    const restaurantIds = myFavorites.map(favorite => favorite.dataValues.restaurantId)
    const restaurantImg = await Image.findAll({where: {restaurantId: restaurantIds}});
    const restaurantName = await Store.findAll({where : {restaurantId : restaurantIds}})

    console.log("1", myFavorites)
    console.log("2", restaurantName)
    console.log("3", restaurantImg)
    res.json({myFavorites, restaurantName, restaurantImg})


  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ message: "error" });
  }
})

// 사용자 1:1 문의하기
app.post('/complain/users/:userId', async (req,res)=>{
  const newInfo = req.body;
  console.log(newInfo)
  try{
    const complain = await Complain.create(newInfo)
    res.json({message : "성공" });
  }

  catch(err){
    console.log(err)
    res.status(500).send('서버 오류 발생')
  }
})

// 사용자 컴플래인 목록
app.get('/complainList/users/:userId', async (req, res)=>{
  const {userId} = req.params;
  console.log(userId)
  try {
    const complains = await Complain.findAll({where : {userId : userId}})
    console.log('컴플래인 : ', complains)
    res.json({complains})
  } catch (error) {
    console.error("처리중 오류 발생", error);
    res.status(500).send("서버 오류 발생");
  }
})

// 관리자 1:1 문의내역 가져오기
app.get('/complainList/admin', async (req,res)=>{
  
  try{
    const complainList = await Complain.findAll()
    res.json({complainList : complainList});
  }

  catch(err){
    console.log(err)
    res.status(500).send('서버 오류 발생')
  }
})

// 관리자 문의 내역 디테일 페이지
app.get('/complainDetailPost/admin/:userId', async(req, res)=>{
  const {userId} = req.params;
  
  try{
    const complain = await Complain.findOne({where : {userId}})
  res.json({complain : complain})

  }
  catch(err){
    console.log(err)
    res.status(500).send('서버 오류 발생');
  }
})

app.post('/complainDetailPost/admin/:adminId', async (req,res) =>{
  const newInfo = req.body
  console.log(newInfo);
  try{
    const answer = await Response.create(newInfo)
    res.json({message : "성공" });
  }

  catch(err){
    console.log(err)
    res.status(500).send('서버 오류 발생')
  }

})


// 컴플레인 디테일
app.get('/complainDetail/users/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const complainList = await Complain.findOne({ where: { userId } });
    
    if (!complainList) {
      return res.status(404).json({ error: 'Complain not found' });
    }
    
    console.log(complainList);
    
    const response = await Response.findAll({ where: { complainId: complainList.dataValues.complainId } });
    console.log('리스폰스 :', response);
    
    res.json({ complainList });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
