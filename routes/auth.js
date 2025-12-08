// routes/auth.js
const express = require("express");
const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const router = express.Router();
const prisma = new PrismaClient();

// GET /auth/register
router.get("/register", (req, res) => {
  res.render("auth/register");
});

// POST /auth/register
router.post("/register", async (req, res) => {
  const { email, password, passwordConfirm } = req.body;

  if (!email || !password || !passwordConfirm) {
    req.flash("error", "すべての項目を入力してください。");
    return res.redirect("/auth/register");
  }
  if (password !== passwordConfirm) {
    req.flash("error", "パスワードが一致しません。");
    return res.redirect("/auth/register");
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      req.flash("error", "このメールアドレスはすでに登録されています。");
      return res.redirect("/auth/register");
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hash }
    });

    req.session.userId = user.id;
    res.redirect("/items");
  } catch (err) {
    console.error(err);
    req.flash("error", "登録に失敗しました。");
    res.redirect("/auth/register");
  }
});

// GET /auth/login
router.get("/login", (req, res) => {
  res.render("auth/login");
});

// POST /auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    req.flash("error", "メールアドレスとパスワードを入力してください。");
    return res.redirect("/auth/login");
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      req.flash("error", "メールアドレスまたはパスワードが違います。");
      return res.redirect("/auth/login");
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      req.flash("error", "メールアドレスまたはパスワードが違います。");
      return res.redirect("/auth/login");
    }

    req.session.userId = user.id;
    res.redirect("/items");
  } catch (err) {
    console.error(err);
    req.flash("error", "ログインに失敗しました。");
    res.redirect("/auth/login");
  }
});

// POST /auth/logout
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/auth/login");
  });
});

module.exports = router;
