// Configurazione Firebase per la sincronizzazione dei progressi.
// Questi valori non sono segreti: la protezione è data dalle regole di Firestore
// (ognuno legge e scrive solo il documento nailcap/{proprio uid}).
// Con null la sincronizzazione è spenta e il gioco salva solo sul dispositivo.
window.NAILCAP_FIREBASE = {
  apiKey: 'AIzaSyAcwaTieXRetOkA4DH9CM3VBhratsjZlus',
  authDomain: 'nailcap-gpverse.firebaseapp.com',
  projectId: 'nailcap-gpverse',
  storageBucket: 'nailcap-gpverse.firebasestorage.app',
  messagingSenderId: '987708316297',
  appId: '1:987708316297:web:9b10e6a097c8d56285c458'
};
