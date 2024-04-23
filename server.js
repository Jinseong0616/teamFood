// 1. 모듈 - require
const express = require('express')
const bodyParser = require('body-parser')
const sequelize = require('sequelize')
const app = express()
const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')
const axios = require('axios')

// db
const db = require('./models')
const {User, Store, Restaurant, Image, Favorite, Review,Region} = db

// 포트

const port = 3000

// 2. use, set 
app.set('view engine', 'ejs')
app.use(express.static(__dirname + '/public'))

app.use(express.json())
app.use(express.urlencoded({extended : true}))

// 3. listen
app.listen(port, ()=>{
  console.log('접속 성공! - http://localhost:'+ port)
})

app.use(passport.initialize())

app.use(session({
    secret: '1234',
    resave : false,
    saveUninitialized : false,
    cookie : {maxAge: 60*60*1000}
}))

app.use(passport.session())

passport.use(new LocalStrategy(async (username, pw, done)=>{
  let result = await User.findOne({where : {userId : username}})
  
  if(!result){
    return done(null, false, {message : 'ID가 DB에 없음'})
  }
  else if(result.password != pw){
    return done(null, false, {message : '비밀번호 불일치'})
  }
  else{
    return done(null, result)
  }

}))

app.get('/',async (req,res)=>{
  const userId = req.isAuthenticated() ? req.user.userId : false

  res.render('index.ejs', {userId})
})

app.get('/region', async (req,res)=>{
  const selectedCity = req.query.city;

  let guList;

  guList = await Region.findAll({where : { city : selectedCity }})

  res.json(guList)
})


app.get('/login', (req,res)=>{
  res.render('loginPage.ejs')
})

app.post('/login',(req,res)=>{
  passport.authenticate('local', (error, user, info)=>{
      
      console.log(error)
      console.log(user)
      console.log(info)
      if(error) return res.status(500).json(error) // 인증 과정에서 오류
      if(!user) return res.send('로그인 실패')

      req.logIn(user, (err)=>{
          if(err) return next(err)
           req.session.userId = user.userId;
           return res.redirect('/')   
      })
  })(req,res)
})

passport.serializeUser((user, done) =>{
  process.nextTick(()=>{
    // 세션 생성할 때 비밀번호가 들어가지 않음, user의  id와 이름만 알려주면 이 정보를 기록해주고
    // 유효기간은 cookie에 생성해준 기간으로 자동으로 생성해서 기록해줌.
    done(null, {userId : user.userId})
  })
})

passport.deserializeUser(async(user, done) =>{
  let result = await User.findOne({where : {userId : user.userId}})
  delete result.password  // 객체에서 파라미터 지움. password 파라미터 필요없어서 지움
  
    const newUserInfo={
      userId : result.userId,
      
    }
  process.nextTick(()=>{
    return done(null, newUserInfo)
  })
})




// 메인 페이지
app.get('/', (req,res)=>{
  const userId = req.isAuthenticated() ? req.user.userId : false
  res.render('index.ejs', {userId})
})




// 로그아웃
app.get('/logout', (req,res)=>{
  req.logout(()=>{
    res.redirect('/')
  })
})

// 세부 페이지 (***기능구현만 일단 해놓은 상태***)
app.get('/detail/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 레스토랑 정보 가져오기
    const restaurant = await Store.findOne({ where: { restaurantId: id } });
    // 레스토랑에 대한 리뷰 가져오기
    const reviews = await Review.findAll({ where: { restaurantId: id } });
    // 레스토랑 리뷰의 해당 유저의 사진 가져오기
    // const reviewPic = await Image.findOne({ where: { reviewId: id } });

    // 회원별로 작성한 리뷰에 대한 평균별점 계산
    const userRatings = {}; // 각 회원별 평균별점과 리뷰 개수를 저장할 객체
    reviews.forEach(review => {
      if (!(review.userId in userRatings)) {
        userRatings[review.userId] = { totalRating: 0, reviewCount: 0 };
      }
      userRatings[review.userId].totalRating += review.rating;
      userRatings[review.userId].reviewCount++;
    });
    // 각 회원별 평균별점 계산
    const userAvgRatings = {};
    Object.keys(userRatings).forEach(userId => {
      userAvgRatings[userId] = {
        avgRating: userRatings[userId].totalRating / userRatings[userId].reviewCount,
        reviewCount: userRatings[userId].reviewCount
      };
    });

    res.render('detail.ejs', { restaurant, reviews, userAvgRatings });
  } catch (error) {
    console.error('에러 발생:', error);
    res.status(500).send('서버 에러');
  }
});

// 회원가입 페이지
app.get('/join', async function(req,res){
  res.render('joinPage.ejs')
})


// 회원가입
app.post('/join', async function(req,res){
  const newMember = req.body
  console.log(newMember)
  try{
      const member = await User.findOne({where : {userId : newMember.userId}})
      if(member){
          return res.send('중복입니다.')
      }
      const addMember = await User.create(newMember)
      res.redirect('/login')
  }catch(error){
      console.log('검색 중 오류 발생', error)
      res.status(500).send("서버 오류 발생");
  }
}) 

// 마이페이지
app.get('/myPage/:id', async(req,res)=>{
    const {id} = req.params
    console.log(id)
    const member = await User.findOne({where : {userId : id}})  // 회원 정보
    const memImg = await Image.findOne({where : {userId : id}})

    res.render('myPage.ejs', {member, memImg})
})

app.put('/edit/:id', async (req,res)=>{
  const {id} = req.params
  const newInfo = req.body
  const member = await User.findOne({where : {userId : id}})
  

  if(member){
    Object.keys(newInfo).forEach((prop)=>{
      member[prop] = newInfo[prop]
    })
    await member.save()
    res.redirect('/')
  }
})


