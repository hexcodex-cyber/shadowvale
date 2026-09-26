# Firebase setup (about 5 minutes)
1. **Create a project:** go to https://console.firebase.google.com and click **Add project**. Name it (e.g. `shadowvale`). Google Analytics is optional. Click **Create**.
2. **Add a web app:** on the Project Overview page click the **Web `</>`** icon. Give it the nickname `shadowvale-web` and leave Hosting unticked. Click **Register app**. Copy the `firebaseConfig` object it shows.
3. **Paste the config:** put those values into **`js/firebase-config.js`** (`window.FIREBASE_CONFIG = {...}`). Fields: `apiKey`, `authDomain`, `databaseURL`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`. The snippet may not include `databaseURL` until step 5 is done; after creating the database, copy its URL from the Realtime Database page (e.g. `https://<project>-default-rtdb.<region>.firebasedatabase.app`).
4. **Enable sign-in providers:** go to **Build → Authentication** and click **Get started**. On the **Sign-in method** tab:
   - **Email/Password:** turn on **Enable** (the first toggle only) and click **Save**.
   - **Google:** turn on **Enable**, pick a project support email, and click **Save**.
5. **Create the Realtime Database:** go to **Build → Realtime Database**, click **Create Database**, pick a location, then choose **Start in locked mode** and click **Enable**.
6. **Paste the rules:** on the Realtime Database **Rules** tab, replace everything with the contents of **`database.rules.json`** and click **Publish**.
7. **Authorise the domain:** go to **Authentication → Settings → Authorized domains**, click **Add domain**, and enter `hexcodex-cyber.github.io`. (`localhost` is already there, for local testing.)
8. Commit and push `js/firebase-config.js`. The web config is not a secret; the database rules protect the data. Reload https://hexcodex-cyber.github.io/shadowvale/ and the login form appears instead of "Multiplayer not configured".

**Database layout:**
- `users/{uid}/save`: JSON string of the save
- `presence/{uid}`: `{name, zone, x, y, dir, lead, lvl, battle, ts}`, removed on disconnect
- `chat/{pushId}`: `{uid, name, text, ts}`; the client shows the last 50
- `worldboss`: `{hp, max, hits, defeatedBy, defeatedAt}`, the shared Riftmaw HP pool
