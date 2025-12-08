// app.js
require("dotenv").config();
const express = require("express");
const path = require("path");
const session = require("express-session");
const flash = require("connect-flash");
const morgan = require("morgan");

const authRouter = require("./routes/auth");
const itemsRouter = require("./routes/items");
const { attachUser } = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 3000;

// ビュー設定
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// ミドルウェア
app.use(morgan("dev"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false
  })
);
app.use(flash());
app.use((req, res, next) => {
  res.locals.errorMessages = req.flash("error");
  res.locals.infoMessages = req.flash("info");
  next();
});

app.use(attachUser);

// ルーティング
app.get("/", (req, res) => {
  if (req.session.userId) {
    return res.redirect("/items");
  }
  res.redirect("/auth/login");
});

app.use("/auth", authRouter);
app.use("/items", itemsRouter);

// エラーハンドラ簡易版
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send("Server Error");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
