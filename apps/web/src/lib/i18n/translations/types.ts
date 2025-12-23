// i18n Type Definitions

export type Language = 'en' | 'de';

export interface Translations {
	// Common UI elements
	common: {
		loading: string;
		cancel: string;
		submit: string;
		create: string;
		join: string;
		share: string;
		change: string;
		set: string;
		remove: string;
		close: string;
		or: string;
		you: string;
		anonymous: string;
		linkCopied: string;
	};

	// Connection states
	connection: {
		connecting: string;
	};

	// Lobby Menu
	lobbyMenu: {
		playNow: string;
		privateRoom: string;
		enterRoomCode: string;
		createPrivateRoom: string;
		joinRoom: string;
		passwordOptional: string;
		codePlaceholder: string;
		playersOnline: string;
	};

	// Lobby Room
	lobbyRoom: {
		room: string;
		publicLobby: string;
		passwordProtected: string;
		inviteFriends: string;
		startGame: string;
		leaveLobby: string;
		needMorePlayers: string;
		needMorePlayer: string;
		waitingForPlayers: string;
		waitingForPlayer: string;
		gameStartingSoon: string;
		changePassword: string;
		setPassword: string;
		newPasswordPlaceholder: string;
		spectatorNotice: string;
	};

	// Player list
	playerList: {
		player: string;
		players: string;
	};

	// Drawing phase
	drawing: {
		draw: string;
		clear: string;
		submitted: string;
		waitingForOthers: string;
	};

	// Voting phase
	voting: {
		round: string;
		whichIsBetter: string;
		clickToVote: string;
		voted: string;
		waitingForNextRound: string;
		loadingImages: string;
		vs: string;
		voteForImageA: string;
		voteForImageB: string;
	};

	// Finale phase
	finale: {
		title: string;
		pickYourFavorite: string;
		votedResultsSoon: string;
		yourArt: string;
		elo: string;
	};

	// Results phase
	results: {
		title: string;
		prompt: string;
		nextRoundStarting: string;
		returnToLobby: string;
		place: string;
		votes: string;
		allSubmissions: string;
		firstPlace: string;
		secondPlace: string;
		thirdPlace: string;
	};

	// Password input
	passwordInput: {
		enterPassword: string;
		submitLabel: string;
		cancelLabel: string;
	};

	// Username editor
	usernameEditor: {
		namePlaceholder: string;
		nameCannotBeEmpty: string;
		maxCharacters: string;
		clickToChangeName: string;
	};

	// Cookie notice
	cookieNotice: {
		sessionData: string;
		ipUsage: string;
		noPersonalData: string;
		gotIt: string;
	};

	// Idle warning
	idleWarning: {
		title: string;
		message: string;
		imHere: string;
	};

	// Session blocked
	sessionBlocked: {
		title: string;
		message1: string;
		message2: string;
		tryAgain: string;
	};

	// Countdown
	countdown: {
		getReady: string;
	};

	// Password modal
	passwordModal: {
		title: string;
		roomRequiresPassword: string;
	};

	// Share
	shareText: string;

	// GitHub
	github: {
		viewOnGithub: string;
		openSource: string;
	};

	// Error messages
	errors: {
		duplicateSession: string;
		alreadyInGame: string;
		joinFailed: string;
		roomNotFound: string;
		wrongPassword: string;
		passwordBlocked: string;
		notEnoughPlayers: string;
		kicked: string;
		idleDisconnect: string;
		instanceClosed: string;
		genericError: string;
	};

	// Color palette
	colorPalette: {
		title: string;
	};

	// Game modes
	gameModes: {
		pixelBattle: string;
		pixelBattleDesc: string;
		duel: string;
		duelDesc: string;
		soloPractice: string;
		soloPracticeDesc: string;
		selectMode: string;
	};

	// Landing page
	landing: {
		heroTitle: string;
		heroSubtitle: string;
		tryIt: string;
		startPlaying: string;
		featureDrawTitle: string;
		featureDrawDesc: string;
		featureVoteTitle: string;
		featureVoteDesc: string;
		featureWinTitle: string;
		featureWinDesc: string;
		drawingTime: string;
		votingRounds: string;
		quickMatches: string;
		seconds: string;
		perRound: string;
		underMinutes: string;
	};

	// Accessibility labels
	accessibility: {
		pixelCanvas: string;
		pixelCanvasReadonly: string;
		closeModal: string;
		shareRoom: string;
	};
}
