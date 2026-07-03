# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start Metro (port **8082** — avoids clashing with other Expo apps in the monorepo)

   ```bash
   cd apps/demo-app
   yarn start
   ```

3. Run on iOS simulator (separate terminal, or press `i` in the Metro terminal)

   ```bash
   yarn ios
   ```

   This app uses **expo-dev-client** (development build). If you see *No script URL provided*,
   rebuild native after dependency changes. This is also required after adding
   Lottie support for ONBORN `animated_asset` primitives:

   ```bash
   cd apps/demo-app
   npx expo prebuild --platform ios --clean
   yarn ios
   ```

   Optional for simulator only — `ios/.xcode.env.local`:

   ```bash
   export REACT_NATIVE_PACKAGER_HOSTNAME=localhost
   export RCT_METRO_PORT=8082
   ```

   For a real iOS/Android device, the SDK cannot reach your Mac through
   `localhost`. The demo app rewrites SDK requests to the Expo LAN host when
   possible. If requests stay pending, set the backend URL explicitly in
   `apps/demo-app/.env`:

   ```bash
   EXPO_PUBLIC_ONBORN_API_URL=http://YOUR_MAC_LAN_IP:3002
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
