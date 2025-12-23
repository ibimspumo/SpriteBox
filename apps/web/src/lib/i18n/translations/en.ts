import type { Translations } from './types';

export const en: Translations = {
	common: {
		loading: 'Loading...',
		cancel: 'Cancel',
		submit: 'Submit',
		create: 'Create',
		join: 'Join',
		share: 'Share',
		change: 'Change',
		set: 'Set',
		remove: 'Remove',
		close: 'Close',
		or: 'or',
		you: 'You',
		anonymous: 'Anonymous',
		linkCopied: 'Link copied!',
	},

	connection: {
		connecting: 'Connecting...',
	},

	lobbyMenu: {
		playNow: 'Play Now',
		privateRoom: 'Private Room',
		enterRoomCode: 'Enter Room Code',
		createPrivateRoom: 'Create Private Room',
		joinRoom: 'Join Room',
		passwordOptional: 'Password (optional)',
		codePlaceholder: 'CODE',
		playersOnline: 'Players Online',
	},

	lobbyRoom: {
		room: 'Room',
		publicLobby: 'Public Lobby',
		passwordProtected: 'Password protected',
		inviteFriends: 'Invite friends',
		startGame: 'Start Game',
		leaveLobby: 'Leave Lobby',
		needMorePlayers: 'Need {{count}} more players',
		needMorePlayer: 'Need {{count}} more player',
		waitingForPlayers: 'Waiting for {{count}} more players...',
		waitingForPlayer: 'Waiting for {{count}} more player...',
		gameStartingSoon: 'Game starting soon...',
		changePassword: 'Change Password',
		setPassword: 'Set Password',
		newPasswordPlaceholder: 'New password (min 4 chars)',
		spectatorNotice: 'You are spectating this round',
	},

	playerList: {
		player: 'Player',
		players: 'Players',
	},

	drawing: {
		draw: 'Draw:',
		clear: 'Clear',
		submitted: 'SUBMITTED!',
		waitingForOthers: 'Waiting for others...',
	},

	voting: {
		round: 'ROUND',
		whichIsBetter: 'WHICH PIXEL ART IS BETTER?',
		clickToVote: 'CLICK TO VOTE',
		voted: 'VOTED!',
		waitingForNextRound: 'WAITING FOR NEXT ROUND...',
		loadingImages: 'LOADING IMAGES...',
		vs: 'VS',
		voteForImageA: 'Vote for image A',
		voteForImageB: 'Vote for image B',
	},

	finale: {
		title: 'Finale',
		pickYourFavorite: 'Pick your favorite!',
		votedResultsSoon: 'Voted! Results coming soon...',
		yourArt: 'Your art',
		elo: 'Elo:',
	},

	results: {
		title: 'Game Results',
		prompt: 'Prompt:',
		nextRoundStarting: 'Next round starting soon...',
		returnToLobby: 'Return to Lobby',
		place: 'Place',
		votes: 'votes',
		allSubmissions: 'All Submissions',
		firstPlace: '1st Place',
		secondPlace: '2nd Place',
		thirdPlace: '3rd Place',
	},

	passwordInput: {
		enterPassword: 'Enter password',
		submitLabel: 'Submit',
		cancelLabel: 'Cancel',
	},

	usernameEditor: {
		namePlaceholder: 'Name',
		nameCannotBeEmpty: 'Name cannot be empty',
		maxCharacters: 'Max. 20 characters',
		clickToChangeName: 'Click to change name',
	},

	cookieNotice: {
		sessionData: 'This game stores your session data temporarily while you play.',
		ipUsage: 'Your IP address is used for rate limiting and security purposes only.',
		noPersonalData: 'No personal data is permanently stored or shared.',
		gotIt: 'Got it!',
	},

	idleWarning: {
		title: 'Are you still there?',
		message: "You'll be disconnected soon due to inactivity.",
		imHere: "I'm here!",
	},

	sessionBlocked: {
		title: 'Already Playing?',
		message1: 'It looks like you have SpriteBox open in another window or tab.',
		message2: 'Close the other one first, then come back here!',
		tryAgain: 'Try Again',
	},

	countdown: {
		getReady: 'Get Ready!',
	},

	passwordModal: {
		title: 'Password Required',
		roomRequiresPassword: 'requires a password.',
	},

	shareText: 'Play SpriteBox - Multiplayer Pixel Art Game!',

	github: {
		viewOnGithub: 'View on GitHub',
		openSource: 'Open Source',
	},

	errors: {
		duplicateSession: 'You are already in this game in another tab',
		alreadyInGame: 'You are already in a game',
		joinFailed: 'Failed to join the game',
		roomNotFound: 'Room not found',
		wrongPassword: 'Incorrect password',
		passwordBlocked: 'Too many failed attempts. Try again later.',
		notEnoughPlayers: 'Not enough players to start',
		kicked: 'You were kicked from the game',
		idleDisconnect: 'Disconnected due to inactivity',
		instanceClosed: 'The game was closed',
		genericError: 'An error occurred',
	},

	colorPalette: {
		title: 'COLOR PALETTE',
	},

	gameModes: {
		pixelBattle: 'Pixel Battle',
		pixelBattleDesc: 'Draw 8×8 pixel art, vote on others, climb the Elo rankings',
		duel: '1v1 Duel',
		duelDesc: 'Challenge a friend to a pixel art duel',
		soloPractice: 'Solo Practice',
		soloPracticeDesc: 'Practice your pixel art skills without time pressure',
		selectMode: 'Select Game Mode',
	},

	landing: {
		heroTitle: 'Pixel Art Battles',
		heroSubtitle: 'Draw. Vote. Win.',
		tryIt: 'Try it out!',
		startPlaying: 'Start Playing',
		featureDrawTitle: 'Draw',
		featureDrawDesc: '8×8 pixel art in 30 seconds',
		featureVoteTitle: 'Vote',
		featureVoteDesc: 'Pick the best art each round',
		featureWinTitle: 'Win',
		featureWinDesc: 'Climb the Elo rankings',
		drawingTime: 'Drawing',
		votingRounds: 'Voting',
		quickMatches: 'Matches',
		seconds: '30s',
		perRound: '5s/round',
		underMinutes: '<3 min',
	},

	accessibility: {
		pixelCanvas: '8x8 pixel art canvas - use arrow keys to navigate, space or enter to draw',
		pixelCanvasReadonly: '8x8 pixel art canvas (readonly)',
		closeModal: 'Close modal',
		shareRoom: 'Share room link',
	},
};
