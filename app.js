const path = require('path');
const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const exphbs = require('express-handlebars');
const methodOverride = require('method-override');
const passport = require('passport');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const connectDB = require('./config/db');
const cloudinary = require("cloudinary").v2;
const multer = require("multer");



// LOAD CONFIG
dotenv.config({path: './config/config.env'})

//LOAD PASSPORT
require('./config/passport')(passport)

//Load cloudinary 
require("dotenv").config({ path: "./config/.env" });

connectDB();

const app = express();

//BODY PARSER
app.use(express.urlencoded({ extended: false}))
app.use(express.json())

// Method override
app.use(
  methodOverride(function (req, res) {
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
      // look in urlencoded POST bodies and delete it
      let method = req.body._method
      delete req.body._method
      return method
    }
  })
)

//DETERMINE LEVEL OF LOGGING
if(process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'))
}

//Handlebars Helpers
const { formatDate, stripTags, truncate, editIcon, select } = require('./helpers/hbs')

//Handlebars
app.engine(
    '.hbs', 
    //!Change: add '.engine' after exphbs
    exphbs.engine({
        helpers: {
            formatDate,
            stripTags,
            truncate,
            editIcon,
            select
        },
        defaultLayout: 'main',
        extname: '.hbs'
    })
);
app.set('view engine', '.hbs');

// SESSIONS
app.use(
    session({
      secret: 'keyboard cat',
      resave: false,
      saveUninitialized: false,
      //!Change: MongoStore syntax has changed
      store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI
      })
    })
  )
  

// PASSPORT MIDDLEWARE
app.use(passport.initialize())
app.use(passport.session())

//Cloudinary Middleware 
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

module.exports = cloudinary;

//Multer Middleware 
module.exports = multer({
  storage: multer.diskStorage({}),
  fileFilter: (req, file, cb) => {
    let ext = path.extname(file.originalname);
    if (ext !== ".jpg" && ext !== ".jpeg" && ext !== ".png") {
      cb(new Error("File type is not supported"), false);
      return;
    }
    cb(null, true);
  },
});

//SET GLOBAL VARIABLE
app.use(function(req, res, next){
    res.locals.user = req.user || null
    next()
})

//STATIC FOLDER
app.use(express.static(path.join(__dirname, 'public')))

//ROUTES
app.use('/', require('./routes/index'))
app.use('/auth', require('./routes/auth'))
app.use('/stories', require('./routes/stories'))

const PORT = process.env.PORT || 3000

app.listen(
    PORT, 
    console.log(`Server running on ${process.env.NODE_ENV} mode on PORT ${PORT}`)
    )