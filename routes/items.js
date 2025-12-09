// routes/items.js
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { ensureAuth } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// ヘルパー：サマリー計算
function calcSummary(items) {
  let income = 0;
  let expense = 0;
  for (const item of items) {
    if (item.type === "INCOME") income += item.amount;
    if (item.type === "EXPENSE") expense += item.amount;
  }
  return {
    totalIncome: income,
    totalExpense: expense,
    balance: income - expense
  };
}

// GET /items  一覧＋フィルタ
router.get("/", ensureAuth, async (req, res) => {
  const userId = req.session.userId;

  // EJS 側の name 属性に合わせておく
  const filterType = req.query.type || "all";        // all / INCOME / EXPENSE
  const startDate  = req.query.startDate || "";
  const endDate    = req.query.endDate || "";

  const where = { userId };

  // 区分フィルタ
  if (filterType === "INCOME") {
    where.type = "INCOME";
  } else if (filterType === "EXPENSE") {
    where.type = "EXPENSE";
  }

  // 期間フィルタ
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) {
      const d = new Date(endDate);
      d.setDate(d.getDate() + 1); // 終了日の 23:59:59 まで含めたいので +1日
      where.date.lte = d;
    }
  }

  try {
    const items = await prisma.item.findMany({
      where,
      orderBy: { date: "desc" },
    });

    // ここでサマリーを計算（既に calcSummary があるならそれを使う）
    const summary = calcSummary(items);
    // 例:
    // function calcSummary(items) {
    //   let income = 0, expense = 0;
    //   for (const it of items) {
    //     if (it.type === "INCOME") income += it.amount;
    //     else if (it.type === "EXPENSE") expense += it.amount;
    //   }
    //   return { income, expense, balance: income - expense };
    // }

    res.render("items/index", {
      items,

      // ★ EJS が期待している名前で渡す
      totalIncome: summary.income,
      totalExpense: summary.expense,

      // フィルタ状態（EJS 側の変数名と合わせる）
      filterType,
      startDate,
      endDate,

      // フラッシュメッセージ（なければとりあえず空配列でOK）
      errorMessages: req.flash ? req.flash("error") : [],
      successMessages: req.flash ? req.flash("success") : [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching items");
  }
});


// GET /items/new  新規作成フォーム
router.get("/new", ensureAuth, (req, res) => {
  res.render("items/form", { item: null });
});

// POST /items/new  新規作成
router.post("/new", ensureAuth, async (req, res) => {
  const userId = req.session.userId;
  const { event, amount, type, date, memo } = req.body;

  if (!amount || !type) {
    req.flash("error", "金額と収支区分は必須です。");
    return res.redirect("/items/new");
  }

  try {
    await prisma.item.create({
      data: {
        userId,
        event: event || "(無題)",
        amount: parseInt(amount, 10),
        type, // "INCOME" or "EXPENSE"
        memo: memo || "",
        date: date ? new Date(date) : new Date()
      }
    });
    res.redirect("/items");
  } catch (err) {
    console.error(err);
    req.flash("error", "保存に失敗しました。");
    res.redirect("/items/new");
  }
});

// GET /items/edit/:id  編集フォーム
router.get("/edit/:id", ensureAuth, async (req, res) => {
  const id = Number(req.params.id);
  const userId = req.session.userId;

  try {
    const item = await prisma.item.findFirst({
      where: { id, userId }
    });

    if (!item) {
      req.flash("error", "項目が見つかりません。");
      return res.redirect("/items");
    }

    res.render("items/form", { item });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading item");
  }
});

// POST /items/edit/:id  更新
router.post("/edit/:id", ensureAuth, async (req, res) => {
  const id = Number(req.params.id);
  const userId = req.session.userId;
  const { event, amount, type, date, memo } = req.body;

  if (!amount || !type) {
    req.flash("error", "金額と収支区分は必須です。");
    return res.redirect(`/items/edit/${id}`);
  }

  try {
    const item = await prisma.item.findFirst({ where: { id, userId } });
    if (!item) {
      req.flash("error", "項目が見つかりません。");
      return res.redirect("/items");
    }

    await prisma.item.update({
      where: { id },
      data: {
        event: event || "(無題)",
        amount: parseInt(amount, 10),
        type,
        memo: memo || "",
        date: date ? new Date(date) : new Date()
      }
    });

    res.redirect("/items");
  } catch (err) {
    console.error(err);
    req.flash("error", "更新に失敗しました。");
    res.redirect(`/items/edit/${id}`);
  }
});

// POST /items/delete/:id  削除
router.post("/delete/:id", ensureAuth, async (req, res) => {
  const id = Number(req.params.id);
  const userId = req.session.userId;

  try {
    const item = await prisma.item.findFirst({ where: { id, userId } });
    if (!item) {
      req.flash("error", "項目が見つかりません。");
      return res.redirect("/items");
    }
    await prisma.item.delete({ where: { id } });
    res.redirect("/items");
  } catch (err) {
    console.error(err);
    req.flash("error", "削除に失敗しました。");
    res.redirect("/items");
  }
});

// GET /items/detail?id=123  詳細表示（query 使用）
router.get("/detail", ensureAuth, async (req, res) => {
  const id = Number(req.query.id);
  const userId = req.session.userId;

  try {
    const item = await prisma.item.findFirst({
      where: { id, userId }
    });

    if (!item) {
      req.flash("error", "項目が見つかりません。");
      return res.redirect("/items");
    }

    res.render("items/detail", { item });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading detail");
  }
});

// 収支アイテム削除
router.post("/delete", ensureAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const id = parseInt(req.body.id, 10);

    if (isNaN(id)) {
      console.error("Invalid id:", req.body.id);
      return res.status(400).send("Invalid id");
    }

    // ログインしているユーザーのデータだけ削除する
    await prisma.item.delete({
      where: { id: id }
    });

    // メッセージ出したい場合（connect-flash使ってるなら）
    if (req.flash) {
      req.flash("success", "1件削除しました");
    }

    res.redirect("/items");
  } catch (err) {
    console.error(err);
    if (req.flash) {
      req.flash("error", "削除中にエラーが発生しました");
      return res.redirect("/items");
    }
    res.status(500).send("Error deleting item");
  }
});


module.exports = router;
