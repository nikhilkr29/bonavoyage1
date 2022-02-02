const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const ejsMate = require('ejs-mate');
const flash = require('connect-flash');
const session = require('express-session');
const methodOverride = require('method-override');
const passport=require('passport');
const LocalStrategy=require('passport-local');
const bodyParser = require("body-parser");
const passportLocalMongoose = require("passport-local-mongoose")
const User = require("./model/user");

const ExpressError = require('./utils/ExpressError');
const catchAsync = require('./utils/catchAsync');
const {isLoggedIn} = require('./middleware');

mongoose.connect('mongodb+srv://jaahnvi:jaahnvi13@cluster0.tqmie.mongodb.net/myFirstDatabase?retryWrites=true&w=majority', {
});


const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});

const app = express();

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))

app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'views')));
app.use(express.static(path.join(__dirname, 'public')))
app.use(express.urlencoded({ extended: true }))
app.use(bodyParser.urlencoded({ extended: true }));

const sessionConfig = {
    name: 'session',
    secret: 'thisshouldbeabettersecret!',
    resave: false,
    saveUninitialized: true,
    cookie: {
       httpOnly: true,
        // secure: true,
       expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
       maxAge: 1000 * 60 * 60 * 24 * 7
    }
}

app.use(session(sessionConfig));
app.use(flash());
 
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
 
app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
})

app.get("/", (req, res) => {
    res.render("users/login");
});

app.post('/login',passport.authenticate('local', {failureFlash: true, failureRedirect: '/' }),async(req,res)=>{
    console.log('Authentication Successful');
    req.flash('success', 'Welcome to Bon Voyage!');
    const redirectUrl=req.session.returnTo || '/home';
    delete req.session.returnTo;
    res.redirect(redirectUrl);
});

app.get('/logout',(req,res)=>{
    req.logout();
    req.flash('success','Successfully logged out!');
    res.redirect('/');
});

app.get('/out',(req,res)=>{
   req.logout();
   req.flash('error','You are not allowed to access that page!');
   res.redirect('/');
})

app.get('/signup',(req,res)=>{
    res.render('users/register');
});

app.post('/signup',catchAsync(async(req,res)=>{
    try{
    const {usern,username,contact,emai,password} = req.body;
    const user= new User({usern,username,contact,emai});
    const registeredUser=await User.register(user,password);
    req.login(registeredUser,err=>{
        if(err) return next(err);
        req.flash('success',"Welcome to Bon Voyage!");
        res.redirect('/home');
    })
    } catch (e){
        req.flash('error',e.message);
        res.redirect('signup');
    }
}));

app.get('/home',isLoggedIn,(req, res) => {
    res.render('users/home');
});

app.all('*', (req, res, next) => {
    next(new ExpressError('Page Not found'), 404);
});

app.use((err, req, res, next) => {
    const { statusCode = 500 } = err;
    if (!err.message) err.message = 'Something went wrong!';
    res.status(statusCode).render('error', { err });
})

app.listen(3000,  () => {
    console.log("Server Has Started!");
});