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
		backToHome: string;
		backToModes: string;
		differentMode: string;
		alpha: string;
		gotIt: string;
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
		copyCat: string;
		copyCatDesc: string;
		pixelGuesser: string;
		pixelGuesserDesc: string;
		pixelSurvivor: string;
		pixelSurvivorDesc: string;
		duel: string;
		duelDesc: string;
		soloPractice: string;
		soloPracticeDesc: string;
		selectMode: string;
	};

	// CopyCat mode
	copyCat: {
		memorize: string;
		memorizeDesc: string;
		drawFromMemory: string;
		accuracy: string;
		matchingPixels: string;
		winner: string;
		draw: string;
		youWon: string;
		youLost: string;
		waitingForOpponent: string;
		referenceImage: string;
		// Rematch
		playAgain: string;
		rematchQuestion: string;
		yesRematch: string;
		noThanks: string;
		rematchAccepted: string;
		startingNewRound: string;
		backToLobby: string;
		opponentDeclined: string;
		rematchTimeout: string;
		wantsRematch: string;
		declined: string;
	};

	// PixelGuesser mode
	pixelGuesser: {
		title: string;
		description: string;
		round: string;
		artist: string;
		youAreArtist: string;
		drawThisWord: string;
		guessTheWord: string;
		enterGuess: string;
		guessPlaceholder: string;
		correct: string;
		close: string;
		wrong: string;
		alreadyGuessed: string;
		waitingForReveal: string;
		theWordWas: string;
		score: string;
		points: string;
		position: string;
		guessedIn: string;
		artistBonus: string;
		noOneGuessed: string;
		finalResults: string;
		totalScore: string;
	};

	// Landing page
	landing: {
		heroTitle: string;
		heroSubtitle: string;
		heroDescription: string;
		tryIt: string;
		startPlaying: string;
		chooseModes: string;
		multipleModesHint: string;
	};

	// Accessibility labels
	accessibility: {
		pixelCanvas: string;
		pixelCanvasReadonly: string;
		closeModal: string;
		shareRoom: string;
	};

	// Mode selection page
	modeSelection: {
		title: string;
		playersActive: string;
		players: string;
		classic: {
			name: string;
			description: string;
		};
		copycat: {
			name: string;
			description: string;
		};
		pixelguesser: {
			name: string;
			description: string;
		};
		survivor: {
			name: string;
			description: string;
		};
	};

	// Stats
	stats: {
		title: string;
		gamesPlayed: string;
		wins: string;
		top3: string;
		winRate: string;
		currentStreak: string;
		bestStreak: string;
		bestAccuracy: string;
		totalStats: string;
		modeStats: string;
		noStatsYet: string;
	};

	// Pixel Survivor mode
	pixelSurvivor: {
		// Menu
		title: string;
		subtitle: string;
		newRun: string;
		continueRun: string;
		statistics: string;
		howToPlay: string;
		abandonWarning: string;
		runs: string;
		wins: string;
		bestDayLabel: string;
		// Character Creation
		createCharacter: string;
		drawYourCharacter: string;
		previewStats: string;
		randomize: string;
		clear: string;
		startRun: string;
		minPixelsHint: string;
		characterName: string;
		defaultName: string;
		// Stats (full names for legend)
		hp: string;
		attack: string;
		defense: string;
		speed: string;
		luck: string;
		element: string;
		trait: string;
		pixels: string;
		effect: string;
		// Stat abbreviations (for compact display)
		statAbbr: {
			hp: string;
			attack: string;
			defense: string;
			speed: string;
			luck: string;
		};
		// Elements
		elements: {
			fire: string;
			water: string;
			earth: string;
			air: string;
			dark: string;
			light: string;
			neutral: string;
		};
		// Traits
		traits: {
			perfectionist: string;
			chaotic: string;
			bulky: string;
			minimalist: string;
			creative: string;
			focused: string;
			intellectual: string;
			grounded: string;
			balanced: string;
		};
		// Rarities
		rarities: {
			common: string;
			uncommon: string;
			rare: string;
			legendary: string;
		};
		// Gameplay
		day: string;
		dayOf: string;
		level: string;
		food: string;
		gold: string;
		materials: string;
		// Events
		eventCategories: {
			combat: string;
			survival: string;
			exploration: string;
			social: string;
			mystery: string;
			boss: string;
		};
		// Drawing
		drawSolution: string;
		hint: string;
		submit: string;
		analyzing: string;
		// Results
		success: string;
		failure: string;
		xpGained: string;
		goldGained: string;
		damageTaken: string;
		continue: string;
		match: string;
		// Food bonuses
		foragedFood: string;
		cookedMeal: string;
		// Level Up
		levelUp: string;
		chooseUpgrade: string;
		reroll: string;
		// Game Over
		gameOver: string;
		survived: string;
		finalScore: string;
		newHighscore: string;
		tryAgain: string;
		backToMenu: string;
		// Victory
		victory: string;
		congratulations: string;
		youSurvived: string;
		// Boss Battle
		bossTitle: string;
		bossSubtitle: string;
		drawWeapon: string;
		bossHp: string;
		yourHp: string;
		attackBoss: string;
		flee: string;
		bossDefeated: string;
		youFled: string;
		// Starvation
		starving: string;
		noFood: string;
		// Category Names
		categories: {
			weapon: string;
			shield: string;
			shelter: string;
			fire: string;
			water: string;
			food: string;
			tool: string;
			trap: string;
			bridge: string;
			boat: string;
			rope: string;
			light: string;
			armor: string;
			potion: string;
			distraction: string;
			unknown: string;
		};
		// Soft Hints
		hints: {
			// Negative hints (what's wrong)
			needsMoreWidth: string;
			needsMoreHeight: string;
			tooTall: string;
			tooWide: string;
			needsHollow: string;
			tooDense: string;
			tooHollow: string;
			needsWarmColors: string;
			needsCoolColors: string;
			needsPointy: string;
			needsYellow: string;
			needsNaturalColors: string;
			needsDenser: string;
			needsMorePixels: string;
			moveDown: string;
			// Positive hints (what's good)
			lookingSharp: string;
			goodWidth: string;
			goodHeight: string;
			goodSize: string;
			goodColors: string;
			goodHollow: string;
			goodPosition: string;
			goodDensity: string;
			goodSpread: string;
			goodShape: string;
			niceAndFlat: string;
			sturdyLooking: string;
		};
		// Result Explanation
		resultExplanation: {
			detectedAs: string;
			expectedCategory: string;
			whatWasWrong: string;
			howToFix: string;
			conditionMet: string;
			conditionMissing: string;
		};
		// Category Requirements
		requirements: {
			minWidth: string;
			maxHeight: string;
			minHeight: string;
			isHollow: string;
			isPointy: string;
			isFlat: string;
			warmColors: string;
			coolColors: string;
			highDensity: string;
			lowDensity: string;
		};
		// UI Labels
		validSolutions: string;
		currentlyDetected: string;
		noValidShape: string;
		// Tutorial / How to Play
		tutorial: {
			goal: string;
			goalText: string;
			character: string;
			characterText: string;
			characterStats: {
				morePixels: string;
				asymmetric: string;
				bulky: string;
				spreadOut: string;
				manyColors: string;
			};
			events: string;
			eventsText: string;
			eventCategories: {
				combat: string;
				survival: string;
				exploration: string;
				social: string;
			};
			drawingTips: string;
			drawingTipsList: {
				analyzeShape: string;
				tallThin: string;
				wideHollow: string;
				warmColors: string;
				coolColors: string;
			};
			resources: string;
			resourcesList: {
				hp: string;
				food: string;
				gold: string;
				xp: string;
			};
			victory: string;
			victoryText: string;
		};
	};
}
