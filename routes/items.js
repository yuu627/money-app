const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { ensureAuth } = require("../middlewares/auth");

// 収支サマリー計算
function calcSummary(items) {
  let income = 0;
  let expense = 0;

  for (const item of items) {
    if (item.type === "INCOME") {
      income += item.amount || 0;
    } else if (item.type === "EXPENSE") {
      expense += item.amount || 0;
    }
  }

  return {
    income,
    expense,
    balance: income - expense,
  };
}

// 一覧 + フィルタ
router.get("/", ensureAuth, async (req, res) => {
  const userId = req.session.userId;

  const filterType = req.query.type || "ALL"; // ALL / INCOME / EXPENSE
  const start = req.query.start || "";
  const end = req.query.end || "";

  const where = { userId };

  if (filterType === "INCOME") {
    where.type = "INCOME";
  } else if (filterType === "EXPENSE") {
    where.type = "EXPENSE";
  }

  if (start || end) {
    where.date = {};
    if (start) where.date.gte = new Date(start);
    if (end) {
      const d = new Date(end);
      d.setDate(d.getDate() + 1); // 終了日を含めるため +1 日
      where.date.lte = d;
    }
  }

  try {
    const items = await prisma.item.findMany({
      where,
      orderBy: { date: "desc" },
    });

    const summary = calcSummary(items);

    res.render("items/index", {
      items,
      summary,
      filterType,
      start,
      end,
      successMessages: req.flash("success"),
      errorMessages: req.flash("error"),
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching items");
  }
});

// 新規作成フォーム
router.get("/new", ensureAuth, (req, res) => {
  res.render("items/form", {
    item: null,
    errors: [],
  });
});

// 新規登録処理
router.post("/", ensureAuth, async (req, res) => {
  const userId = req.session.userId;
  const { event, amount, type, date, memo } = req.body;

  const errors = [];
  if (!amount) errors.push("金額は必須です。");
  if (!type) errors.push("収支区分は必須です。");
  if (!date) errors.push("日付は必須です。");

  if (errors.length) {
    return res.status(400).render("items/form", {
      item: {
        event,
        amount,
        type,
        memo,
        date: date ? new Date(date) : new Date(),
      },
      errors,
    });
  }

  try {
    await prisma.item.create({
      data: {
        userId,
        event: event || "",
        amount: Number(amount),
        type,
        memo: memo || "",
        date: new Date(date),
      },
    });
    req.flash("success", "収支を登録しました。");
    res.redirect("/items");
  } catch (err) {
    console.error(err);
    req.flash("error", "登録に失敗しました。");
    res.redirect("/items");
  }
});

// 編集フォーム
router.get("/:id/edit", ensureAuth, async (req, res) => {
  const userId = req.session.userId;
  const id = Number(req.params.id);

  try {
    const item = await prisma.item.findFirst({
      where: { id, userId },
    });

    if (!item) {
      req.flash("error", "データが見つかりませんでした。");
      return res.redirect("/items");
    }

    res.render("items/form", {
      item,
      errors: [],
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "編集画面の表示に失敗しました。");
    res.redirect("/items");
  }
});

// 更新処理
router.post("/:id", ensureAuth, async (req, res) => {
  const userId = req.session.userId;
  const id = Number(req.params.id);
  const { event, amount, type, date, memo } = req.body;

  const errors = [];
  if (!amount) errors.push("金額は必須です。");
  if (!type) errors.push("収支区分は必須です。");
  if (!date) errors.push("日付は必須です。");

  if (errors.length) {
    return res.status(400).render("items/form", {
      item: {
        id,
        event,
        amount,
        type,
        memo,
        date: date ? new Date(date) : new Date(),
      },
      errors,
    });
  }

  try {
    await prisma.item.updateMany({
      where: { id, userId },
      data: {
        event: event || "",
        amount: Number(amount),
        type,
        memo: memo || "",
        date: new Date(date),
      },
    });
    req.flash("success", "収支を更新しました。");
    res.redirect("/items");
  } catch (err) {
    console.error(err);
    req.flash("error", "更新に失敗しました。");
    res.redirect("/items");
  }
});

// 削除
router.post("/:id/delete", ensureAuth, async (req, res) => {
  const userId = req.session.userId;
  const id = Number(req.params.id);

  try {
    await prisma.item.deleteMany({
      where: { id, userId },
    });
    req.flash("success", "削除しました。");
  } catch (err) {
    console.error(err);
    req.flash("error", "削除に失敗しました。");
  }

  res.redirect("/items");
});

// 詳細ページ
router.get("/:id", ensureAuth, async (req, res) => {
  const userId = req.session.userId;
  const id = Number(req.params.id);

  try {
    const item = await prisma.item.findFirst({
      where: { id, userId },
    });

    if (!item) {
      return res.status(404).send("Not found");
    }

    res.render("items/show", { item });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching detail");
  }
});

module.exports = router;
