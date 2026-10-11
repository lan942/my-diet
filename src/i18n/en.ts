// 英文语言包（key 清单的唯一事实来源，zh.ts 必须与其 key 完全一致）

export const en = {
  // Tab
  'tab.profile': 'Me',
  'tab.food': 'Food',
  'tab.today': 'Today',
  'tab.steps': 'Steps',

  // Common
  'common.loading': 'Loading…',
  'common.error': 'Error',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.saveFailed': 'Save failed',
  'common.deleteFailed': 'Delete failed',
  'common.lowGi': 'Low GI',
  'common.all': 'All',
  'common.today': 'Today',
  'common.yesterday': 'Yesterday',
  'common.dayBeforeYesterday': '2 days ago',

  // Macros & gender & units
  'macro.calorie': 'Calories',
  'macro.protein': 'Protein',
  'macro.carb': 'Carbs',
  'macro.fat': 'Fat',
  'macro.proteinUnit': 'g protein',
  'gender.male': 'Male',
  'gender.female': 'Female',
  'gender.unknown': 'Undisclosed',
  'unit.metric': 'Metric (cm / kg)',
  'unit.us': 'US (ft / lb)',
  'unit.age': 'yrs',
  'unit.cm': 'cm',
  'unit.kg': 'kg',
  'unit.in': 'in',
  'unit.lb': 'lb',
  'unit.ftInFormat': '{label} ({inches} in)',

  // Profile
  'profile.dailyTarget': 'Daily Target (estimated)',
  'profile.tdeeNote':
    'TDEE = BMR × activity factor (Mifflin-St Jeor), estimated from your profile weight and basics.',
  'profile.basicInfo': 'Basic Info',
  'profile.age': 'Age (years)',
  'profile.agePh': 'e.g. 30',
  'profile.unitLabel': 'Units',
  'profile.heightCm': 'Height (cm)',
  'profile.heightCmPh': 'e.g. 170',
  'profile.weightKg': 'Weight (kg)',
  'profile.weightKgPh': 'e.g. 70.5',
  'profile.heightFt': 'Height (feet)',
  'profile.heightFtPh': 'e.g. 5',
  'profile.heightIn': 'Height (inches)',
  'profile.heightInPh': 'e.g. 7',
  'profile.weightLb': 'Weight (lb)',
  'profile.weightLbPh': 'e.g. 154.3',
  'profile.activity': 'Activity Level',
  'profile.bmrNote':
    'BMR: male 10×weight + 6.25×height − 5×age + 5; female −161; undisclosed −78.',
  'profile.ratioTitle': 'Macro Ratio (must sum to 1)',
  'profile.quickPresets': 'Quick Presets',
  'profile.orManually': '— or adjust manually —',
  'profile.carbRatio': 'Carb ratio',
  'profile.proteinRatio': 'Protein ratio',
  'profile.fatRatio': 'Fat ratio',
  'profile.ratioSum': 'Current ratio sum: {sum}',
  'profile.formulaNote':
    'Carb g = TDEE × carb ratio ÷ 4\nProtein g = TDEE × protein ratio ÷ 4\nFat g = TDEE × fat ratio ÷ 9',
  'profile.saveAll': 'Save Profile & Ratios',
  'profile.saved': 'Saved',
  'profile.savedDetail':
    'Profile and macro ratios updated. Other tabs have refreshed.',
  'profile.presetApplied': '“{label}” preset applied',
  'profile.presetRatio': 'P{p}/F{f}/C{c}',

  // Activity levels
  'activity.1.label': 'Sedentary',
  'activity.1.desc': 'Little or no exercise, desk job',
  'activity.2.label': 'Lightly active',
  'activity.2.desc': 'Light exercise 1–3 days/week',
  'activity.3.label': 'Moderately active',
  'activity.3.desc': 'Moderate exercise 3–5 days/week',
  'activity.4.label': 'Very active',
  'activity.4.desc': 'Hard exercise 6–7 days/week',
  'activity.5.label': 'Athlete',
  'activity.5.desc': 'Physical job or daily intense training',

  // Goal presets
  'goal.fatLoss.label': 'Fat Loss',
  'goal.fatLoss.desc': 'Calorie deficit, burn fat first',
  'goal.maintain.label': 'Maintain',
  'goal.maintain.desc': 'Balanced intake, keep steady',
  'goal.muscle.label': 'Muscle Gain',
  'goal.muscle.desc': 'Carb fuel to support training',

  // Meals
  'meal.breakfast': 'Breakfast',
  'meal.lunch': 'Lunch',
  'meal.dinner': 'Dinner',
  'meal.snack': 'Snack',

  // Intake (Today)
  'intake.dailyProgress': "Today's Progress",
  'intake.emptyTarget': 'Finish your profile in “Me” first',
  'intake.recordTitle': 'Record Intake',
  'intake.selectFood': 'Choose a food…',
  'intake.grams': 'Amount (g)',
  'intake.gramsPh': 'e.g. 150',
  'intake.add': 'Add',
  'intake.todayLog': "Today's Log",
  'intake.emptyLog': 'Nothing logged yet today',
  'intake.deletedFood': '(deleted food)',

  // Food library
  'food.count': '{n} foods',
  'food.empty': 'No foods yet',
  'food.addTitle': 'Add Food',
  'food.editTitle': 'Edit Food',
  'food.name': 'Name',
  'food.kcal100': 'kcal/100g',
  'food.protein100': 'Protein/100g',
  'food.carb100': 'Carbs/100g',
  'food.fat100': 'Fat/100g',
  'food.giOptional': 'GI (optional)',
  'food.notes': 'Notes',
  'food.errName': 'Name is required',
  'food.errNutrition': 'Nutrition values must be numbers',
  'food.deleteTitle': 'Delete food',
  'food.deleteMsg': 'Delete “{name}”?',
  'food.cannotDelete': 'Cannot delete',

  // Steps
  'steps.today': "Today's Steps",
  'steps.unit': 'steps',
  'steps.kcalHint': '≈ {kcal} kcal burned',
  'steps.inputTitle': 'Enter Steps',
  'steps.label': 'Steps',
  'steps.labelPh': 'e.g. 8000',
  'steps.saveOverwrite': 'Save (overwrites the day)',
  'steps.history': 'History',
  'steps.empty': 'No step records yet',

  // Step sync (Health Connect / HealthKit)
  'sync.button': 'Sync from Health',
  'sync.rationale':
    'We read today’s step count from your device health service to estimate active energy. Data stays on this device.',
  'sync.success': 'Synced {steps} steps',
  'sync.denied': 'Permission denied. You can still enter steps manually.',
  'sync.unavailable': 'Health service not available on this device',
  'sync.done': 'Already synced via health service',
  'sync.protected': 'Manual entry for this day kept — sync skipped.',

  // Onboarding
  'onboarding.stepOf': 'Step {step} of 4',
  'onboarding.title.1': "What's your goal?",
  'onboarding.title.2': 'Body Basics',
  'onboarding.title.3': 'Gender (optional)',
  'onboarding.title.4': 'Daily Activity Level',
  'onboarding.hint.1': 'Pick the closest goal — we’ll set your macro ratios from it',
  'onboarding.hint.2': 'Drag the ruler to pick values. Metric or US units supported.',
  'onboarding.hint.3': 'Prefer privacy? Skip it — we’ll use a neutral formula.',
  'onboarding.hint.4': 'Be honest about your weekly exercise to estimate daily burn',
  'onboarding.offlineBadge': '100% offline · data never leaves your device',
  'onboarding.prev': 'Back',
  'onboarding.next': 'Next',
  'onboarding.done': 'Finish',
  'onboarding.genderMaleDesc': 'BMR offset +5',
  'onboarding.genderFemaleDesc': 'BMR offset −161',
  'onboarding.genderUnknownDesc': 'Private, neutral formula −78',
  'onboarding.genderNote':
    'If skipped: BMR = 10×weight + 6.25×height − 5×age − 78 (neutral). You can change it anytime in “Me”.',
  'onboarding.doneTitle': 'All Set!',
  'onboarding.doneSubtitle': 'Daily target generated from the “{goal}” goal',
  'onboarding.kcalPerDay': 'kcal / day (TDEE)',
  'onboarding.doneHint': "You're ready to start logging today's food",
  'onboarding.saving': 'Saving…',
  'onboarding.start': 'Start Logging',
  'onboarding.backToEdit': 'Back to Edit',
  'onboarding.saveFailed': 'Save failed. Please try again.',

  // Categories (display mapping for seed data)
  'cat.carb': 'Carbs',
  'cat.protein': 'Protein',
  'cat.fat': 'Fats',
  'cat.antioxidantVeg': 'Antioxidant Veggies',
  'cat.fiber': 'Fiber',

  // Compliance
  'profile.disclaimer':
    'Disclaimer: This app is for informational and educational purposes only and is not intended as medical advice. Please consult a healthcare professional before starting any diet or exercise program.',

  // Error codes → messages
  'error.ERR_INVALID_STEPS': 'Steps must be a non-negative number',
  'error.ERR_INVALID_GRAMS': 'Amount must be a positive number',
  'error.ERR_INVALID_GENDER': 'Invalid gender',
  'error.ERR_INVALID_AGE': 'Age must be between 1 and 120',
  'error.ERR_INVALID_HEIGHT': 'Height must be positive',
  'error.ERR_INVALID_WEIGHT': 'Weight must be positive',
  'error.ERR_INVALID_ACTIVITY_FACTOR': 'Invalid activity factor',
  'error.ERR_RATIO_SUM': 'Macro ratios must sum to 100%',
  'error.ERR_NUTRITION_NOT_FINITE': 'Nutrition values must be finite numbers',
  'error.ERR_NUTRITION_NEGATIVE': 'Nutrition values must be non-negative',
  'error.ERR_EMPTY_FOOD_NAME': 'Food name is required',
  'error.ERR_FOOD_IN_USE': 'This food is referenced by intake logs and cannot be deleted',
  'error.generic': 'Something went wrong',
} as const;

export type TranslationKey = keyof typeof en;
export type TranslationParams = Record<string, string | number>;
