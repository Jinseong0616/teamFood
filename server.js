// 1. 모듈 - require
const express = require('express')
const bodyParser = require('body-parser')
const sequelize = require('sequelize')
const path = require('path')
const app = express()
const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')
const axios = require('axios')
const multer = require('multer')
const {Op} = require('sequelize')


// 이미지 디렉토리 설정

const uploadStore = multer({dest: 'uploads/store'}) // 스토어
const uploadUser = multer({dest: 'uploads/users'})  // 회원



const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/test') // 파일이 저장될 경로
  },
  filename: function(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`) // 파일명 설정
  }
});
const upload = multer({storage : storage})




// db
const db = require('./models')
const {User, Store, Restaurant, Image, Favorite, Review,region} = db
// Store.hasMany(Image, { foreignKey: 'restaurantId' })
// Image.belongsTo(Store, { foreignKey: 'restaurantId' });
// 포트

const port = 3000

// 2. use, set 
app.set('view engine', 'ejs')
app.use(express.static(__dirname + '/public'))
app.use(express.static(__dirname + '/uploads'))

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
app.get('/logout', (req,res)=>{
  req.logout(()=>{
    res.redirect('/')
  })
})

// 세부 페이지 (** *기능구현만 일단 해놓은 상태 ***)
app.get('/detail/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 레스토랑 정보 가져오기
    const restaurant = await Store.findOne({ where: { restaurantId: id } });

    // 레스토랑에 대한 리뷰 가져오기
    const reviews = await Review.findAll({ where: { restaurantId: id } });
    
    const imgUrl = await Image.findAll({where : {restaurantId : id}})
    
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

    res.render('detail.ejs', { restaurant, reviews, userAvgRatings, imgList : imgUrl });
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
app.post('/join', uploadUser.single('imgUrl'), async function(req,res){
  const newMember = req.body
  const newFile = req.file
  console.log(newFile.filename)
  try{

      
      const member = await User.findOne({where : {userId : newMember.userId}})
      if(member){
          return res.send('중복입니다.')
      }

      const addMember = await User.create(newMember)
      
      await Image.create({
        userId : addMember.userId,
        imgUrl : newFile.filename
      })
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
  
  console.log(selectedCity)

  let guList;

  guList = await region.findAll({where : { city : selectedCity }})

  console.log(guList)

  res.json(guList)
})


// 검색 기능
app.get('/search', async function(req,res){  

  const searchKeyword = req.query.keyword;
  console.log('검색어는 ? ',searchKeyword)
  try {
    // 가게 이름 또는 지역 카테고리에 검색어가 포함되어 있는 가게를 찾습니다.
    const shops = await Store.findAll({

     where: {
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
          },
          {
            restaurantAddress:{
              [Op.like]: `%${searchKeyword}%`
            }
          }
        ]
      },
      include: [{
        model: Image,
        attributes: ['imgUrl']
      }] 
  });

    // console.log(shops[0].Images)

    res.render('search.ejs', {shops}); // 검색 결과를 클라이언트에게 전달합니다.

    console.log(shops[0].Images)

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '검색 실패' })
  }
})


// 음식점 추가하기
app.get('/add', async function(req,res){
  res.render('shopAdd.ejs')
})

// 음식점 추가하기
app.post('/add', upload.array('imgUrl', 2), async function(req,res){

  const newStore = req.body;

  // 파일 업로드
  const newFiles = req.files;
  console.log(newStore)

  // console.log(req.file.filename)  // multer를 통해 파일의 변경된 이름 가져옴 req.file.filename

 
  try {
    
    const existStore = await Store.findOne({ where: {restaurantAddress : newStore.restaurantAddress}});

    // 파일 업로드가 성공적으로 이루어졌는지 확인
    if (!newFiles || newFiles.length === 0) {
      return res.status(400).send('파일이 업로드되지 않았습니다.');
    }
    
    if (existStore) {
      return res.status(400).send("이미 등록된 음식점입니다");
    }

    const addStore = await Store.create(newStore);
    
    if(addStore){
      for(const file of newFiles){
        await Image.create({
          restaurantId : addStore.restaurantId,
          imgUrl : file.filename  // 여러 파일을 다루므로  newFile 대신 file 사용
        })
      }
    }
    //res.status(200).send("등록 성공!");
    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '음식점 등록 실패' });
  }

}) 


// 회원탈퇴
app.delete('/delete/:id', async function(req, res){
  const id = req.params.id
  console.log('아이디 : ',id)

  try {
    await User.destroy({where : {userId : id}})
    console.log('잘처리됨')
    res.sendStatus(200);
  } catch (error) {
    console.error("처리중 오류 발생",error);
    res.status(500).send('서버 오류 발생');
  } 

})
