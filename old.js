const cloudinary = require("cloudinary").v2;
const nodemailer = require("nodemailer");
const admin = require("firebase-admin");
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_KEY))
});
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  api_key: process.env.CLOUDINARY_API_KEY
});
const db = admin.firestore();
const app = express();
const PORT = 8000;
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (["https://imabm.eu.cc", "http://localhost:5000"].indexOf(origin) !== -1) return callback(null, true);
    else return callback(null, false);
  },
  methods: ["GET", "POST"],
  credentials: true
}));
app.use(express.json());
app.set("trust proxy", 1);



const RP_NAME = "ImABM";
const RP_ID   = "imabm.eu.cc";
const ORIGIN  = "https://imabm.eu.cc";
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} = require("@simplewebauthn/server");
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  auth: {
    user: "abmmohi.236@gmail.com",
    pass: process.env.MAIL_PASS
  },
  secure: false
});



async function bohudur (end, body) {
  const res = await fetch(`https://request.bohudur.one${end}`, {
    method: "POST",
    headers: {
      "AH-BOHUDUR-API-KEY": process.env.BOHUDUR_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  return res.json();
}
async function notifyAdmin (message) {
  try {
    await fetch(`https://api.telegram.org/bot${process.env.TG_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: process.env.ADMIN_CHATID,
        text: message,
        parse_mode: "Markdown"
      })
    });
  } catch(error) {
    console.error("Error at notifyAdmin: ", error);
  }
}
async function generateProductId (type) {
  const col = db.collection("products").doc(type).collection("items");
  for (let i = 0; i < 100; i++) {
    const id = String(Math.floor(1000000000 + Math.random() * 9000000000));
    const snap = await col.doc(id).get();
    if (!snap.exists) return id;
  }
  throw new Error("Failed To Generate New ID");
}
async function mail ({ html, sender, to, subject, body }) {
  try {
    if (!to || !subject || !body) throw new Error("Expecting \"to\", \"subject\" and \"body\"");
    await transporter.sendMail({
      from: `${sender || "ImABM"} <mail@imabm.eu.cc>`,
      to, subject,
      replyTo: "mail@imabm.eu.cc",
      headers: {
        "List-Unsubscribe": "<mailto:contact@imabm.eu.cc?subject=unsubscribe>",
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
      },
      dkim: {
        domainName:  "imabm.eu.cc",
        keySelector: "1775927237.imabm",
        privateKey:  process.env.DKIM_KEY
      },
      ...(html ? { html: body } : { text: body })
    });
  } catch (error) {
    const e = new Error(error.message);
    e.code = error.responseCode;
    throw e;
  }
}



function closeTab (status) {
  return `<script>
  if (window.opener) window.opener.postMessage({
    type: "payment",
    status: "${status}"
  }, "*");
  window.close();
</script>`;
}



app.get("/", async (req, res) => {
  res.set("Content-Type", "text/plain");
  return res.status(200).send("Im Alive!");
});
app.post("/payment/create", async (req, res) => {
  try {
    const hostName = `${req.protocol}://${req.get("host")}`;
    const { token, amount } = req.body;
    
    if (!token) return res.json({
      success: false,
      message: "Expecting A Token"
    });
    if (!amount) return res.json({
      success: false,
      message: "Amount Required"
    });
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) return res.json({
      success: false,
      message: "Invalid Amount"
    });
    
    const user = await admin.auth().verifyIdToken(token);
    const uid  = user.uid;
    const info = await admin.auth().getUser(uid);
    
    const create = await bohudur("/create/v2/", {
      full_name:    info.displayName || "User",
      email:        info.email,
      amount:       parseFloat(amount),
      return_type:  "POST",
      redirect_url: `${hostName}/payment/success`,
      cancel_url:   `${hostName}/payment/cancel`,
      webhook:      {
        success: `${hostName}/payment/webhook/success`,
        cancel: `${hostName}/payment/webhook/cancel`
      }
    });
    
    if (create.responseCode !== 200) {
      console.error("Payment Create Failed: ", create);
      return res.json({
        success: false,
        message: create.message
      });
    }
    
    const key = create.paymentkey;
    const pData = {
      uid:       uid,
      amount:    parseFloat(amount),
      status:    "PENDING",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }
    
    const batch = db.batch();
    batch.set(db.collection("payments").doc(key),                              pData);
    batch.set(db.collection("users").doc(uid).collection("payments").doc(key), pData);
    await batch.commit();
    
    return res.json({
      success: true,
      message: "Payment Created Successfully",
      checkout: create.payment_url
    });
  } catch(error) {
    console.error("Error at \"/payment/create\": ", error);
    return res.json({
      success: false,
      message: error.message
    });
  }
});
app.post("/payment/webhook/success", async (req, res) => {
  res.json({ received: true });
  try {
    const { paymentkey } = req.body;
    if (!paymentkey) return;
    
    const payRef = db.collection("payments").doc(paymentkey);
    const payDoc = await payRef.get();
    if (!payDoc.exists) return;
    
    const payment = payDoc.data();
    if (payment.status !== "PENDING") return;
    
    const execute = await bohudur("/execute/v2/", { paymentkey });
    if (execute.status !== "EXECUTED") return;
    
    const usrPayRef = db.collection("users").doc(payment.uid).collection("payments").doc(paymentkey);
    const usrRef    = db.collection("users").doc(payment.uid);
    
    await db.runTransaction(async (tx) => {
      const usrDoc = await tx.get(usrRef);
      const curBal = usrDoc.exists ? (usrDoc.data().balance || 0) : 0;
      
      tx.set(usrRef,       { balance: curBal + payment.amount }, { merge: true });
      tx.update(payRef,    { status: "EXECUTED" });
      tx.update(usrPayRef, { status: "EXECUTED" });
    });
    
    const query = await bohudur("/query/v2/", { paymentkey });
    if (query.status === "EXECUTED") await notifyAdmin(
      `✅️ *PAYMENT RECEIVED*\n\n` +
      `👤 *Name*: \`${query.full_name}\`\n` +
      `📧 *Email*: \`${query.email}\`\n` +
      `💰 *Amount*: \`${query.amount}\`\n` +
      `🔑 *PayKey*: \`${query.paymentkey}\`\n` +
      `ℹ️ *Info*: \n${Object.entries(query.payment_info).map(([k, v]) => `          •  *${k[0].toUpperCase() + k.slice(1)}*: \`${v}\``).join("\n")}\n` +
      `📌 *Status*: \`${query.status}\`\n`
    );
  } catch(error) {
    console.error("Error at \"/payment/webhook/success\": ", error);
  }
});
app.post("/payment/webhook/cancel", async (req, res) => {
  res.json({ received: true });
  try {
    const { paymentkey } = req.body;
    if (!paymentkey) return;
    
    const payRef = db.collection("payments").doc(paymentkey);
    const payDoc = await payRef.get();
    if (!payDoc.exists) return;
    
    const payment = payDoc.data();
    if (payment.status !== "PENDING") return;
    
    const usrPayRef = db.collection("users").doc(payment.uid).collection("payments").doc(paymentkey);
    
    const batch = db.batch();
    batch.update(payRef,    { status: "CANCELLED" });
    batch.update(usrPayRef, { status: "CANCELLED" });
    await batch.commit();
    
    const query = await bohudur("/query/v2/", { paymentkey });
    if (query.status === "CANCELLED") await notifyAdmin(
      `❌️ *PAYMENT CANCELLED*\n\n` +
      `👤 *Name*: \`${query.full_name}\`\n` +
      `📧 *Email*: \`${query.email}\`\n` +
      `💰 *Amount*: \`${query.amount}\`\n` +
      `🔑 *PayKey*: \`${query.paymentkey}\`\n` +
      `📌 *Status*: \`${query.status}\`\n`
    );
  } catch(error) {
    console.error("Error at \"/payment/webhook/cancel\": ", error);
  }
});
app.post("/payment/success", async (req, res) => {
  res.send(closeTab("Payment Received"));
});
app.post("/payment/cancel", async (req, res) => {
  res.send(closeTab("Payment Canceled"));
});



app.post("/passkey/options/register", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.json({
      success: false,
      message: "Expecting A Token"
    });
    
    const { uid }    = await admin.auth().verifyIdToken(token);
    const userInfo   = await admin.auth().getUser(uid);
    
    const existingSnap = await db.collection("users").doc(uid).collection("passkeys").get();
    const excludeCredentials = existingSnap.docs.map(doc => ({
      id:   doc.id,
      type: "public-key"
    }));
    
    const options = await generateRegistrationOptions({
      rpName:               RP_NAME,
      rpID:                 RP_ID,
      userID:               new TextEncoder().encode(uid),
      userName:             userInfo.email,
      userDisplayName:      userInfo.displayName || userInfo.email,
      attestationType:      "none",
      excludeCredentials,
      authenticatorSelection: {
        residentKey:      "required",
        userVerification: "preferred"
      }
    });
    
    await db.collection("users").doc(uid).set({
      passkeyChallenge: options.challenge
    }, { merge: true });
    
    return res.json({ success: true, options });
  } catch (error) {
    console.error("Error at \"/passkey/options/register\": ", error);
    return res.json({ success: false, message: error.message });
  }
});
app.post("/passkey/verify/register", async (req, res) => {
  try {
    const { token, response, name } = req.body;
    if (!token) return res.json({
      success: false,
      message: "Expecting A Token"
    });
    
    const { uid }   = await admin.auth().verifyIdToken(token);
    const userDoc   = await db.collection("users").doc(uid).get();
    const challenge = userDoc.data()?.passkeyChallenge;
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin:    ORIGIN,
      expectedRPID:      RP_ID
    });
    
    if (!verification.verified) return res.json({
      success: false,
      message: "Verification Failed"
    });
    
    const { credential } = verification.registrationInfo;
    const { id: credentialID, publicKey: credentialPublicKey, counter } = credential;
    
    await db.collection("users").doc(uid).collection("passkeys").doc(credentialID).set({
      publicKey: Buffer.from(credentialPublicKey).toString("base64url"),
      name:      name || "My Passkey",
      createdAt: Date.now(),
      credentialID,
      counter
    });
    
    await db.collection("passkeys").doc(credentialID).set({ uid });
    await db.collection("users").doc(uid).set({
      passkeyChallenge: admin.firestore.FieldValue.delete()
    }, { merge: true });
    
    return res.json({ success: true, message: "Passkey Registered" });
  } catch (error) {
    console.error("Error at \"/passkey/verify/register\": ", error);
    return res.json({ success: false, message: error.message });
  }
});
app.post("/passkey/options/auth", async (req, res) => {
  try {
    const options = await generateAuthenticationOptions({
      rpID:             RP_ID,
      userVerification: "preferred",
      allowCredentials: []
    });
    
    await db.collection("challenges").doc(options.challenge).set({
      createdAt: Date.now()
    });
    
    const old = await db.collection("challenges")
      .where("createdAt", "<", Date.now() - 300000).get();
    old.forEach(doc => doc.ref.delete());
    
    return res.json({ success: true, options });
  } catch (error) {
    console.error("Error at \"/passkey/options/auth\": ", error);
    return res.json({ success: false, message: error.message });
  }
});
app.post("/passkey/verify/auth", async (req, res) => {
  try {
    const { response } = req.body;
    const clientData = JSON.parse(Buffer.from(response.response.clientDataJSON, "base64url").toString());
    const challenge = clientData.challenge;
    const challengeDoc = await db.collection("challenges").doc(challenge).get();
    if (!challengeDoc.exists) return res.json({
      success: false,
      message: "Invalid Or Expired Challenge"
    });
    await challengeDoc.ref.delete();
    
    const lookupDoc = await db.collection("passkeys").doc(response.id).get();
    if (!lookupDoc.exists) return res.json({
      success: false,
      message: "No Passkey Found"
    });
    const uid        = lookupDoc.data().uid;
    const passkeyDoc = await db.collection("users").doc(uid).collection("passkeys").doc(response.id).get();
    const passkey    = passkeyDoc.data();
    
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge:       challenge,
      expectedOrigin:          ORIGIN,
      expectedRPID:            RP_ID,
      requireUserVerification: false,
      credential: {
        id:        response.id,
        publicKey: new Uint8Array(Buffer.from(passkey.publicKey, "base64url")),
        counter:   passkey.counter
      }
    });
    if (!verification.verified) return res.json({
      success: false,
      message: "Passkey Verification Failed"
    });
    
    await passkeyDoc.ref.update({
      counter: verification.authenticationInfo.newCounter
    });
    const firebaseToken = await admin.auth().createCustomToken(uid);
    return res.json({ success: true, firebaseToken });
  } catch (error) {
    console.error("Error at \"/passkey/verify/auth\": ", error);
    return res.json({ success: false, message: error.message });
  }
});
app.post("/passkey/list", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.json({ success: false, message: "Expecting A Token" });
    
    const { uid } = await admin.auth().verifyIdToken(token);
    const snap    = await db.collection("users").doc(uid).collection("passkeys").get();
    const passkeys = snap.docs.map(doc => ({
      id:        doc.id,
      name:      doc.data().name,
      createdAt: doc.data().createdAt
    }));
    return res.json({ success: true, passkeys });
  } catch (error) {
    console.error("Error at \"/passkey/list\": ", error);
    return res.json({ success: false, message: error.message });
  }
});
app.post("/passkey/delete", async (req, res) => {
  try {
    const { token, credentialID } = req.body;
    if (!token)        return res.json({ success: false, message: "Expecting A Token" });
    if (!credentialID) return res.json({ success: false, message: "Expecting A Credential ID" });
    
    const { uid } = await admin.auth().verifyIdToken(token);
    await Promise.all([
      db.collection("users").doc(uid).collection("passkeys").doc(credentialID).delete(),
      db.collection("passkeys").doc(credentialID).delete()
    ]);
    return res.json({ success: true, message: "Passkey Deleted" });
  } catch (error) {
    console.error("Error at \"/passkey/delete\": ", error);
    return res.json({ success: false, message: error.message });
  }
});



app.post("/user/updateProfile", upload.single("newPhoto"), async (req, res) => {
  try {
    const { token, newName } = req.body;
    const newPhoto = req.file;
    
    if (!token) return res.json({
      success: false,
      message: "Expecting A Token"
    });
    if (!newName && !newPhoto) return res.json({
      success: false,
      message: "Nothing To Update"
    });
    
    const uid = (await admin.auth().verifyIdToken(token)).uid;
    
    const photoURL = newPhoto ? await new Promise((res, rej) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "profiles",
          public_id: uid,
          overwrite: true,
          invalidate: true,
          transformation: [
            { gravity: "face", crop: "fill", height: 250, width: 250 },
            { fetch_format: "auto", quality: "auto" }
          ]
        },
        (error, result) => result ? res(result.secure_url) : rej(error)
      );
      stream.end(newPhoto.buffer);
    }) : null;
    
    if (newName || photoURL) await admin.auth().updateUser(uid, { ...(newName && { displayName: newName }), ...(photoURL && { photoURL }) });
    
    return res.json({
      success:     true,
      message:     "Profile Updated",
      updatedName: newName  || null,
      updatedURL:  photoURL || null
    });
  } catch (error) {
    console.error("Error at \"/user/updateProfile\": ", error);
    return res.json({
      success: false,
      message: error.message
    });
  }
});
app.post("/product/add", upload.single("image"), async (req, res) => {
  //return res.send("OFF ROUTE\n");
  try {
    if (!req.body) return res.json({
      success: false,
      message: "Invalid Body"
    });
    
    const { name, price, description, category, type } = req.body;
    const imageFile = req.file;
    
    if (!name || !price) return res.json({
      success: false,
      message: "Product Name And Price Are Required."
    });
    if (!type || !["digital", "physical"].includes(type)) return res.json({
      success: false,
      message: "Product Type Must Be \"digital\" or \"physical\""
    });
    
    const productId = await generateProductId(type);
    
    let imageUrl = null;
    if (imageFile) {
      imageUrl = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: `products/${type}`,
            public_id: productId,
            overwrite: true,
            invalidate: true,
            transformation: [
              { width: 500, height: 500, crop: "fill", gravity: "auto" },
              { fetch_format: "auto", quality: "auto" }
            ]
          },
          (error, result) => result ? resolve(result.secure_url) : reject(error)
        );
        stream.end(imageFile.buffer);
      });
    }
    
    const productData = {
      id:          parseInt(productId, 10),
      price:       parseFloat(price),
      description: description || "",
      category:    category    || "Uncategorized",
      imageUrl:    imageUrl,
      name,
      type
    };
    
    await db.collection("products").doc(type).collection("items").doc(productId).set(productData);
    
    return res.json({
      success:   true,
      message:   "Product added successfully",
      product:   productData,
      productId
    });
    
  } catch (error) {
    console.error("Error at \"/product/add\": ", error);
    return res.json({
      success: false,
      message: error.message
    });
  }
});



app.listen(PORT, () => { console.log(`Server Running At Port "${PORT}"`); });