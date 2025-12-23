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
		backToHome: 'Zur Startseite',
		backToModes: 'Zur Modusauswahl',
		differentMode: 'Anderer Modus',
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

	gameModes: {
		pixelBattle: 'Pixel Battle',
		pixelBattleDesc: 'Zeichne 8×8 Pixel Art, vote für andere, steige im Elo-Ranking',
		copyCat: 'CopyCat',
		copyCatDesc: 'Merken und nachzeichnen - höchste Genauigkeit gewinnt!',
		duel: '1v1 Duell',
		duelDesc: 'Fordere einen Freund zum Pixel Art Duell heraus',
		soloPractice: 'Solo Übung',
		soloPracticeDesc: 'Übe deine Pixel Art Fähigkeiten ohne Zeitdruck',
		selectMode: 'Spielmodus wählen',
	},

	copyCat: {
		memorize: 'Merken',
		memorizeDesc: 'Studiere das Bild genau!',
		drawFromMemory: 'Aus dem Gedächtnis zeichnen',
		accuracy: 'Genauigkeit',
		matchingPixels: 'Übereinstimmende Pixel',
		winner: 'Gewinner',
		draw: 'Unentschieden',
		youWon: 'Du hast gewonnen!',
		youLost: 'Du hast verloren',
		waitingForOpponent: 'Warte auf Gegner...',
		referenceImage: 'Original',
		// Rematch
		playAgain: 'Nochmal spielen?',
		rematchQuestion: 'Willst du eine weitere Runde spielen?',
		yesRematch: 'Ja, Revanche!',
		noThanks: 'Nein danke',
		rematchAccepted: 'Revanche!',
		startingNewRound: 'Neue Runde startet...',
		backToLobby: 'Zurück zur Lobby',
		opponentDeclined: 'Dein Gegner hat abgelehnt.',
		rematchTimeout: 'Zeit abgelaufen.',
		wantsRematch: 'Will Revanche',
		declined: 'Abgelehnt',
	},

	landing: {
		heroTitle: 'Pixel Art Spiele',
		heroSubtitle: 'Zeichnen. Antreten. Spaß haben.',
		heroDescription: 'Schnelle Multiplayer Pixel Art Spiele für alle. Verschiedene Spielmodi, sofortige Matches, null Aufwand.',
		tryIt: 'Probier es aus!',
		startPlaying: 'Jetzt Spielen',
		chooseModes: 'Wähle deinen Modus',
		multipleModesHint: 'Klassische Battles, 1v1 Duelle & mehr',
	},

	accessibility: {
		pixelCanvas: '8x8 Pixel Art Canvas - nutze die Pfeiltasten zur Navigation, Leertaste oder Enter zum Zeichnen',
		pixelCanvasReadonly: '8x8 Pixel Art Canvas (schreibgeschützt)',
		closeModal: 'Modal schließen',
		shareRoom: 'Raumlink teilen',
	},

	modeSelection: {
		title: 'Wähle deinen Spielmodus',
		playersActive: 'aktiv',
		players: 'Spieler',
		classic: {
			name: 'Klassisch',
			description: '5-100 Spieler, Elo-Voting, steige im Ranking auf',
		},
		copycat: {
			name: 'CopyCat',
			description: '1v1 Memory-Duell - höchste Genauigkeit gewinnt',
		},
	},

	stats: {
		title: 'Deine Statistiken',
		gamesPlayed: 'Gespielte Spiele',
		wins: 'Siege',
		top3: 'Top 3',
		winRate: 'Siegquote',
		currentStreak: 'Aktuelle Serie',
		bestStreak: 'Beste Serie',
		bestAccuracy: 'Beste Genauigkeit',
		totalStats: 'Gesamtstatistik',
		modeStats: 'Statistik nach Modus',
		noStatsYet: 'Noch keine Statistiken - spiel ein Spiel!',
	},
};
