// Configurazione Firebase per la sincronizzazione dei progressi.
// Questi valori non sono segreti: la protezione è data dalle regole di Firestore
// (ognuno legge e scrive solo il documento nailcap/{proprio uid}).
// Con null la sincronizzazione è spenta e il gioco salva solo sul dispositivo.
window.NAILCAP_FIREBASE = null;
