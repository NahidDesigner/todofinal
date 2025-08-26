/* global self, importScripts, firebase */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBjs7MeQuK-BlQT5cgtBRD7iqSd3sByrtk",
  authDomain: "smart-todo-b419c.firebaseapp.com",
  projectId: "smart-todo-b419c",
  messagingSenderId: "671151709526",
  appId: "1:671151709526:web:51e7e1a5ed0856816e4af7",
});
const messaging = firebase.messaging();

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification?.data?.url || (self.location?.origin + '/todo/#/app');
  event.waitUntil(clients.openWindow(url));
});