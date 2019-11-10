const CronJob = require("cron").CronJob;

const Telegraf = require("telegraf");
const Stage = require("telegraf/stage");
const session = require("telegraf/session");
const WizardScene = require("telegraf/scenes/wizard");
const TelegrafInlineMenu = require("telegraf-inline-menu");

const dotenv = require("dotenv");
dotenv.config();

const {
  createUser,
  checkUser,
  reserve,
  updateDays,
  updateState
} = require("./src/database");

const bot = new Telegraf(process.env.BOT_TOKEN);

const superWizard = new WizardScene(
  "super-wizard",
  ctx => {
    ctx.reply("Enter Your Stu Id Number :");
    return ctx.wizard.next();
  },
  ctx => {
    ctx.wizard.state.user = ctx.message.text;
    ctx.reply("Enter Your Refahi's Password :");
    return ctx.wizard.next();
  },
  ctx => {
    ctx.wizard.state.pass = ctx.message.text;
    createUser(
      {
        stuId: ctx.wizard.state.user,
        pass: ctx.wizard.state.pass,
        telId: ctx.from.id,
        chatId: ctx.chat.id
      },
      async res => {
        await ctx.reply(`Saved Successfully\nid: ${res.id}`);
      },
      async res => {
        await ctx.reply(`Error : ${res.err}`);
        await ctx.reply(
          `Need Help ? contact us:  [Parsa Samadnejad](tg://user?id=${process.env.SAM})`,
          { parse_mode: "Markdown" }
        );
      }
    );
    ctx.reply("Press /start to Continue");
    return ctx.scene.leave();
  }
);

const stage = new Stage([superWizard]);

stage.command("cancel", async ctx => {
  await ctx.reply("Operation canceled");
  await ctx.scene.leave();
  ctx.reply("Press /start to Continue");
});
bot.use(session());
bot.use(stage.middleware());

bot.action("SIGN_IN", async ctx => {
  if (ctx.scene.state.signed) {
    ctx.answerCbQuery("You can't SignUp once you've signed up :|");
  } else {
    ctx.editMessageText("/cancel to stop the operation");
    ctx.scene.enter("super-wizard");
  }
});

const menu = new TelegrafInlineMenu(async ctx => {
  let id = await ctx.from.id;
  let res = await checkUser(ctx.from.id);
  if (res) {
    ctx.scene.state.signed = true;
    ctx.scene.state.days = res.days;
    ctx.scene.state.res_state = res.state;
  } else {
    ctx.scene.state.signed = false;
    ctx.scene.state.res_state = false;
  }
  return id == process.env.SAM
    ? `Hey Sam What's up ? ;)\n\n`
    : `How can I help you, ${ctx.from.first_name}?\n\n\nNeed Help ? contact me:  [Parsa Samadnejad](tg://user?id=${process.env.SAM})`;
});

menu.simpleButton("Sign Up for Weekly Reservation", "SIGN_IN", {
  doFunc: ctx => {},
  hide: ctx => ctx.scene.state.signed
});

const daysMenu = new TelegrafInlineMenu("Reserve Days");
const aboutMenu = new TelegrafInlineMenu(
  `Part of _Refahi Sucks_ project\n\nCreated by : [Parsa Samadnejad](tg://user?id=${process.env.SAM})\n\nSpecial thanks to 3PIC and CE-Council 2019 for their Supports.`
);

daysMenu.toggle("Shanbe", "c0", {
  setFunc: (ctx, newVal) => {
    ctx.scene.state.days[0] = newVal;
  },
  isSetFunc: ctx => ctx.scene.state.days[0],
  hide: ctx => !ctx.scene.state.signed
});

daysMenu.toggle("1 Shanbe", "c1", {
  setFunc: (ctx, newVal) => {
    ctx.scene.state.days[1] = newVal;
  },
  isSetFunc: ctx => ctx.scene.state.days[1],
  hide: ctx => !ctx.scene.state.signed
});

daysMenu.toggle("2 Shanbe", "c2", {
  setFunc: (ctx, newVal) => {
    ctx.scene.state.days[2] = newVal;
  },
  isSetFunc: ctx => ctx.scene.state.days[2],
  hide: ctx => !ctx.scene.state.signed
});

daysMenu.toggle("3 Shanbe", "c3", {
  setFunc: (ctx, newVal) => {
    ctx.scene.state.days[3] = newVal;
  },
  isSetFunc: ctx => ctx.scene.state.days[3],
  hide: ctx => !ctx.scene.state.signed
});

daysMenu.toggle("4 Shanbe", "c4", {
  setFunc: (ctx, newVal) => {
    ctx.scene.state.days[4] = newVal;
  },
  isSetFunc: ctx => ctx.scene.state.days[4],
  hide: ctx => !ctx.scene.state.signed
});

daysMenu.simpleButton("Submit", "blah", {
  doFunc: ctx => {
    updateDays(
      ctx.from.id,
      ctx.scene.state.days,
      () => {
        ctx.answerCbQuery("Done !");
      },
      () => {
        ctx.answerCbQuery("Error !");
      }
    );
  },
  hide: ctx => !ctx.scene.state.signed
});

aboutMenu.urlButton("Github repo", "https://github.com/3pic/Refahi_Bot");

menu.submenu("Reserve Days", "days", daysMenu);
menu.toggle("Reserve State", "dfg", {
  setFunc: (ctx, newVal) => {
    updateState(
      ctx.from.id,
      newVal,
      () => {
        ctx.answerCbQuery("Done !");
        ctx.scene.state.res_state = newVal;
      },
      () => {
        ctx.answerCbQuery("Error !");
      }
    );
  },
  isSetFunc: ctx => ctx.scene.state.res_state,
  hide: ctx => !ctx.scene.state.signed
});
menu.submenu("About Us", "about", aboutMenu);

menu.setCommand("start");
bot.use(
  menu.init({
    backButtonText: "Back <-",
    mainMenuButtonText: "Back to Main Menu <-"
  })
);
bot.launch();

const job = new CronJob(
  "39 21 * * 4",
  function() {
    reserve((chatId, res) => {
      if (res.err)
        bot.telegram.sendMessage(chatId, "Reserve Status :  " + res.err);
      bot.telegram.sendMessage(
        chatId,
        "Reserve Status :  " + res.msg + "\nCredit: " + res.credit
      );
    });
  },
  null,
  true,
  "Asia/Tehran"
);
job.start();
