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

	// Colordle game mode
	colordle: {
		title: string;
		subtitle: string;
		guess: string;
		delete: string;
		youWon: string;
		youLost: string;
		guessedIn: string;
		correctAnswer: string;
		theSolution: string;
		attempts: string;
		playAgain: string;
	};

	// Game modes
	gameModes: {
		pixelBattle: string;
		pixelBattleDesc: string;
		copyCat: string;
		copyCatDesc: string;
		copyCatSolo: string;
		copyCatSoloDesc: string;
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
		lookCarefully: string;
		original: string;
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
		youWin: string;
		draw: string;
		rounds: string;
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
		shareArt: string;
	};

	// Share page
	sharePage: {
		title: string;
		shareText: string;
		canYouDoBetter: string;
		playNow: string;
		invalidLink: string;
		createdBy: string;
		createdOn: string;
	};

	// Mode selection page
	modeSelection: {
		title: string;
		playersActive: string;
		players: string;
		multiplayer: string;
		solo: string;
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
		copycatsolo: {
			name: string;
			description: string;
		};
		colordle: {
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

	// Pixel Survivor mode (simplified - character creation only)
	pixelSurvivor: {
		// Menu
		title: string;
		subtitle: string;
		newRun: string;
		statistics: string;
		howToPlay: string;
		abandonWarning: string;
		viewCharacter: string;
		// Character Creation
		createCharacter: string;
		drawYourCharacter: string;
		previewStats: string;
		randomize: string;
		clear: string;
		startRun: string;
		minPixelsHint: string;
		characterName: string;
		enterName: string;
		randomizeName: string;
		// Stats (full names for legend)
		hp: string;
		attack: string;
		defense: string;
		speed: string;
		luck: string;
		element: string;
		trait: string;
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
			fireDesc: string;
			water: string;
			waterDesc: string;
			earth: string;
			earthDesc: string;
			air: string;
			airDesc: string;
			dark: string;
			darkDesc: string;
			light: string;
			lightDesc: string;
			neutral: string;
			neutralDesc: string;
		};
		// Element interactions
		elementInteractions: {
			effective: string;
			superEffective: string;
			resisted: string;
			immune: string;
		};
		// Traits
		traits: {
			perfectionist: string;
			perfectionistDesc: string;
			chaotic: string;
			chaoticDesc: string;
			bulky: string;
			bulkyDesc: string;
			minimalist: string;
			minimalistDesc: string;
			creative: string;
			creativeDesc: string;
			focused: string;
			focusedDesc: string;
			intellectual: string;
			intellectualDesc: string;
			grounded: string;
			groundedDesc: string;
			balanced: string;
			balancedDesc: string;
		};
		// Statistics Screen
		charactersCreated: string;
		totalCharacters: string;
		favoriteElement: string;
		favoriteTrait: string;
		time: string;
		totalPlayTime: string;
		// Tutorial / How to Play
		tutorial: {
			character: string;
			characterText: string;
			characterStats: {
				morePixels: string;
				asymmetric: string;
				bulky: string;
				spreadOut: string;
				manyColors: string;
			};
			comingSoon: string;
			comingSoonText: string;
		};
		// Engine Stats (new)
		stats: {
			hp: string;
			hpDesc: string;
			maxHp: string;
			maxHpDesc: string;
			mana: string;
			manaDesc: string;
			maxMana: string;
			maxManaDesc: string;
			shield: string;
			shieldDesc: string;
			attack: string;
			attackDesc: string;
			defense: string;
			defenseDesc: string;
			speed: string;
			speedDesc: string;
			luck: string;
			luckDesc: string;
			critChance: string;
			critChanceDesc: string;
			critDamage: string;
			critDamageDesc: string;
			dodgeChance: string;
			dodgeChanceDesc: string;
			armorPenetration: string;
			armorPenetrationDesc: string;
			xpRate: string;
			xpRateDesc: string;
			dropChance: string;
			dropChanceDesc: string;
		};
		// Effects
		effects: {
			rage: string;
			rageDesc: string;
			fortify: string;
			fortifyDesc: string;
			haste: string;
			hasteDesc: string;
			luckyStrike: string;
			luckyStrikeDesc: string;
			regeneration: string;
			regenerationDesc: string;
			vampiricTouch: string;
			vampiricTouchDesc: string;
			barrier: string;
			barrierDesc: string;
			poison: string;
			poisonDesc: string;
			burn: string;
			burnDesc: string;
			weakness: string;
			weaknessDesc: string;
			vulnerability: string;
			vulnerabilityDesc: string;
			slow: string;
			slowDesc: string;
			cursed: string;
			cursedDesc: string;
			darkness: string;
			darknessDesc: string;
			blessedGround: string;
			blessedGroundDesc: string;
			levelUpHeal: string;
		};
		// Legend Modal
		legend: {
			title: string;
			howStatsWork: string;
			totalBudget: string;
			primaryStats: string;
			secondaryStats: string;
			points: string;
			// Stat criteria
			statCriteria: {
				title: string;
				hp: string;
				attack: string;
				defense: string;
				speed: string;
				mana: string;
				luck: string;
			};
			// Element criteria
			elementCriteria: {
				title: string;
				colorInfluence: string;
				modifiers: {
					title: string;
					lowDensity: string;
					highDensity: string;
					brightColors: string;
					darkColors: string;
					highDiversity: string;
				};
			};
			// Trait criteria (labels only, values are dynamic)
			traitCriteria: {
				title: string;
				symmetryMin: string;
				symmetryMax: string;
				pixelsMin: string;
				pixelsMax: string;
				colorsMin: string;
				colorsExact: string;
				headRatio: string;
				legRatio: string;
				noTrait: string;
			};
			// Constraint ranges
			ranges: {
				title: string;
				min: string;
				max: string;
			};
			// Color names
			colors: {
				black: string;
				white: string;
				red: string;
				green: string;
				blue: string;
				yellow: string;
				magenta: string;
				cyan: string;
				orange: string;
				purple: string;
				lightBlue: string;
				lime: string;
				pink: string;
				gray: string;
				lightGray: string;
				brown: string;
			};
		};
		// Character View
		resources: string;
		noCharacter: string;
		// Game Shell UI
		gameShell: {
			effects: string;
			settings: string;
			gold: string;
			level: string;
			inventory: string;
			equipment: string;
			buffs: string;
			debuffs: string;
		};
		// Common UI strings
		playDemo: string;
		unknownName: string;
		levelAbbr: string;
		levelFormat: string;
		xpGained: string;
		// Gameplay Demo
		gameplayDemo: {
			eventTitle: string;
			merchantEvent: string;
			tradeOption: string;
			ignoreOption: string;
			attackOption: string;
			tradeResult: string;
			ignoreResult: string;
			attackResult: string;
			placeholder: string;
			placeholderHint: string;
			backToMenu: string;
		};
		// Combat
		combat: {
			attack: string;
			flee: string;
			defend: string;
			yourTurn: string;
			enemyTurn: string;
			encounterStart: string;
			playerAttack: string;
			monsterAttack: string;
			criticalHit: string;
			criticalFail: string;
			superEffective: string;
			notEffective: string;
			victory: string;
			victoryTitle: string;
			defeat: string;
			defeatTitle: string;
			fledSuccess: string;
			fledFailed: string;
			fledTitle: string;
		};
		// Gameplay (exploration / combat flow)
		gameplay: {
			round: string;
			exploringText: string;
			findEnemy: string;
			backToMenu: string;
			victoryTitle: string;
			xpGained: string;
			monstersDefeated: string;
			continue: string;
			defeatTitle: string;
			roundsReached: string;
			returnToMenu: string;
		};
		// Monsters
		monsters: {
			wolf: {
				name: string;
				description: string;
				abilities: {
					bite: string;
					biteDesc: string;
					howl: string;
					howlDesc: string;
				};
			};
		};
	};
}
