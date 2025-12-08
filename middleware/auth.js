// middleware/auth.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function attachUser(req, res, next) {
  const userId = req.session.userId;
  if (!userId) {
    res.locals.currentUser = null;
    return next();
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true }
    });
    req.user = user;
    res.locals.currentUser = user;
    next();
  } catch (err) {
    console.error(err);
    next(err);
  }
}

function ensureAuth(req, res, next) {
  if (!req.session.userId) {
    return res.redirect("/auth/login");
  }
  next();
}

module.exports = { attachUser, ensureAuth };
