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

// 메인 페이지
app.get('/', (req,res)=>{
  const userId = req.isAuthenticated() ? req.user.userId : false
  res.render('index.ejs', {userId})
})

// 로그인페이지
app.get('/login', (req,res)=>{
  res.render('loginPage.ejs')
})

//로그인
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

// 로그아웃
app.get('/logout', (req,res)=>{
  req.logout(()=>{
    res.redirect('/')
  })
})


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


//지역 불러오기 API
app.get('/region', async (req,res)=>{
  const selectedCity = req.query.city;

  let guList;

  guList = await Region.findAll({where : { city : selectedCity }})

  res.json(guList)
})


app.get('/search', async function(req,res){  
  const searchKeyword = req.query.keyword; // 클라이언트로부터 검색어를 받아옵니다.
  console.log('검색어는 ? ',searchKeyword)
  try {
    // 가게 이름 또는 지역 카테고리에 검색어가 포함되어 있는 가게를 찾습니다.
    const shops = await Store.findAll({
      where: {
        [sequelize.Op.or]: [ // 지역
          {
            restaurantName: {[sequelize.Op.like]: `%${searchKeyword}%`} // 검색어에 가게가 포함되어있는거
          },{
            category: {[sequelize.Op.like]: `%${searchKeyword}%`} // 검색어에 카테고리가 포함되어 있는거
          },{
            restaurantAddress: {[sequelize.Op.like]: `%${searchKeyword}%`}
          }

        ]
      }
    });

    res.render('search.ejs', { shops }); // 검색 결과를 클라이언트에게 전달합니다.
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '검색 실패' })
  }
  res.render('search.ejs')
})


// 음식점 추가하기
app.get('/add', async function(req,res){
  res.render('shopAdd.ejs')
})

// 음식점 추가하기
app.post('/add', async function(req,res){
  const { restaurantName, restaurantAddress, openTime, categori, callNumber, views } = req.body;
  console.log(restaurantName)
  console.log(restaurantAddress)
  console.log(openTime)
  console.log(categori)
  console.log(callNumber)
  console.log(views)

  try {
    
    const existStore = await Store.findOne({
      where: {
        restaurantName: restaurantName,
        callNumber: callNumber
      }
    });

    if (existStore) {
      return res.status(400).send("이미 등록된 음식점입니다");
    }


    await Store.create({
      restaurantName: restaurantName,
      restaurantAddress: restaurantAddress,
      openTime: openTime,
      categori: categori,
      callNumber: callNumber,
      views: views
    });


    //res.status(200).send("등록 성공!");
    res.redirect('/search?success=true');
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '음식점 등록 실패' });
  }

}) 
