import type { Translations } from './types';

export const de: Translations = {
	common: {
		loading: 'Laden...',
		cancel: 'Abbrechen',
		submit: 'Absenden',
		create: 'Erstellen',
		join: 'Beitreten',
		share: 'Teilen',
		change: 'Ändern',
		set: 'Setzen',
		remove: 'Entfernen',
		close: 'Schließen',
		or: 'oder',
		you: 'Du',
		anonymous: 'Anonym',
		linkCopied: 'Link kopiert!',
	},

	connection: {
		connecting: 'Verbinde...',
	},

	lobbyMenu: {
		playNow: 'Jetzt spielen',
		privateRoom: 'Privater Raum',
		enterRoomCode: 'Raumcode eingeben',
		createPrivateRoom: 'Privaten Raum erstellen',
		joinRoom: 'Raum beitreten',
		passwordOptional: 'Passwort (optional)',
		codePlaceholder: 'CODE',
		playersOnline: 'Spieler online',
	},

	lobbyRoom: {
		room: 'Raum',
		publicLobby: 'Öffentliche Lobby',
		passwordProtected: 'Passwortgeschützt',
		inviteFriends: 'Freunde einladen',
		startGame: 'Spiel starten',
		leaveLobby: 'Lobby verlassen',
		needMorePlayers: 'Noch {{count}} Spieler benötigt',
		needMorePlayer: 'Noch {{count}} Spieler benötigt',
		waitingForPlayers: 'Warte auf {{count}} weitere Spieler...',
		waitingForPlayer: 'Warte auf {{count}} weiteren Spieler...',
		gameStartingSoon: 'Spiel startet gleich...',
		changePassword: 'Passwort ändern',
		setPassword: 'Passwort setzen',
		newPasswordPlaceholder: 'Neues Passwort (min. 4 Zeichen)',
		spectatorNotice: 'Du schaust diese Runde zu',
	},

	playerList: {
		player: 'Spieler',
		players: 'Spieler',
	},

	drawing: {
		draw: 'Zeichne:',
		clear: 'Löschen',
		submitted: 'ABGESENDET!',
		waitingForOthers: 'Warte auf andere...',
	},

	voting: {
		round: 'RUNDE',
		whichIsBetter: 'WELCHE PIXEL ART IST BESSER?',
		clickToVote: 'KLICKE ZUM ABSTIMMEN',
		voted: 'ABGESTIMMT!',
		waitingForNextRound: 'WARTE AUF NÄCHSTE RUNDE...',
		loadingImages: 'LADE BILDER...',
		vs: 'VS',
		voteForImageA: 'Für Bild A stimmen',
		voteForImageB: 'Für Bild B stimmen',
	},

	finale: {
		title: 'Finale',
		pickYourFavorite: 'Wähle deinen Favoriten!',
		votedResultsSoon: 'Abgestimmt! Ergebnisse kommen gleich...',
		yourArt: 'Deine Kunst',
		elo: 'Elo:',
	},

	results: {
		title: 'Spielergebnisse',
		prompt: 'Aufgabe:',
		nextRoundStarting: 'Nächste Runde startet gleich...',
		returnToLobby: 'Zurück zur Lobby',
		place: 'Platz',
		votes: 'Stimmen',
		allSubmissions: 'Alle Einsendungen',
		firstPlace: '1. Platz',
		secondPlace: '2. Platz',
		thirdPlace: '3. Platz',
	},

	passwordInput: {
		enterPassword: 'Passwort eingeben',
		submitLabel: 'Absenden',
		cancelLabel: 'Abbrechen',
	},

	usernameEditor: {
		namePlaceholder: 'Name',
		nameCannotBeEmpty: 'Name darf nicht leer sein',
		maxCharacters: 'Max. 20 Zeichen',
		clickToChangeName: 'Klicke um den Namen zu ändern',
	},

	cookieNotice: {
		sessionData: 'Dieses Spiel speichert deine Sitzungsdaten temporär während du spielst.',
		ipUsage: 'Deine IP-Adresse wird nur für Ratenbegrenzung und Sicherheit verwendet.',
		noPersonalData: 'Keine persönlichen Daten werden dauerhaft gespeichert oder geteilt.',
		gotIt: 'Verstanden!',
	},

	idleWarning: {
		title: 'Bist du noch da?',
		message: 'Du wirst bald wegen Inaktivität getrennt.',
		imHere: 'Ich bin da!',
	},

	sessionBlocked: {
		title: 'Schon am Spielen?',
		message1: 'Es sieht so aus, als hättest du SpriteBox in einem anderen Fenster oder Tab offen.',
		message2: 'Schließe zuerst das andere, dann komm hierher zurück!',
		tryAgain: 'Erneut versuchen',
	},

	countdown: {
		getReady: 'Mach dich bereit!',
	},

	passwordModal: {
		title: 'Passwort erforderlich',
		roomRequiresPassword: 'benötigt ein Passwort.',
	},

	shareText: 'Spiele SpriteBox - Multiplayer Pixel Art Spiel!',

	github: {
		viewOnGithub: 'Auf GitHub ansehen',
		openSource: 'Open Source',
	},

	errors: {
		duplicateSession: 'Du bist bereits in diesem Spiel in einem anderen Tab',
		alreadyInGame: 'Du bist bereits in einem Spiel',
		joinFailed: 'Beitritt fehlgeschlagen',
		roomNotFound: 'Raum nicht gefunden',
		wrongPassword: 'Falsches Passwort',
		passwordBlocked: 'Zu viele Fehlversuche. Versuch es später nochmal.',
		notEnoughPlayers: 'Nicht genug Spieler zum Starten',
		kicked: 'Du wurdest aus dem Spiel entfernt',
		idleDisconnect: 'Wegen Inaktivität getrennt',
		instanceClosed: 'Das Spiel wurde geschlossen',
		genericError: 'Ein Fehler ist aufgetreten',
	},

	colorPalette: {
		title: 'FARBPALETTE',
	},

	landing: {
		heroTitle: 'Pixel Art Battles',
		heroSubtitle: 'Zeichnen. Voten. Gewinnen.',
		tryIt: 'Probier es aus!',
		startPlaying: 'Jetzt Spielen',
		featureDrawTitle: 'Zeichnen',
		featureDrawDesc: '8×8 Pixel Art in 30 Sekunden',
		featureVoteTitle: 'Voten',
		featureVoteDesc: 'Wähle die beste Kunst jeder Runde',
		featureWinTitle: 'Gewinnen',
		featureWinDesc: 'Steige im Elo-Ranking auf',
		drawingTime: 'Zeichnen',
		votingRounds: 'Voting',
		quickMatches: 'Matches',
		seconds: '30s',
		perRound: '5s/Runde',
		underMinutes: '<3 Min',
	},
};
