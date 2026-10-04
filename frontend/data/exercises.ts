/**
 * The exercise library (#21). Static content, not user data, so client and
 * server components can both import it directly.
 *
 * Adding a clip later: put `<slug>.mp4` and `<slug>.jpg` in
 * public/media/exercises/ and fill in `video`. Nothing else changes.
 */

export type ExerciseCategory = "Upper body" | "Lower body" | "Core" | "Full body" | "Cardio" | "Pilates";

export interface Exercise {
  slug: string;
  name: string;
  /** Used where the name is counted ("3 Criss-Crosses"), when adding an "s"
   *  to `name` would read wrong. Defaults to `name` + "s". */
  plural?: string;
  category: ExerciseCategory;
  muscles: string[];
  unit: "reps" | "seconds";
  /** One line for the card. */
  summary: string;
  cues: string[];
  mistakes: string[];
  video?: { src: string; poster: string };
}

export const EXERCISE_CATEGORIES: ExerciseCategory[] = [
  "Upper body",
  "Lower body",
  "Core",
  "Full body",
  "Cardio",
  "Pilates",
];

export const exercises: Exercise[] = [
  {
    slug: "pushups",
    name: "Push-up",
    category: "Upper body",
    muscles: ["Chest", "Shoulders", "Triceps", "Core"],
    unit: "reps",
    summary: "The one everyone knows. Chest, shoulders and a lot of core.",
    cues: [
      "Hands just wider than your shoulders, fingers spread.",
      "Squeeze your glutes so your body is one straight line.",
      "Lower until your chest is a fist's height from the floor.",
      "Elbows about 45 degrees from your body, not flared out wide.",
    ],
    mistakes: ["Hips sagging toward the floor.", "Half reps that stop well short of the bottom.", "Head dropping before the chest does."],
    video: { src: "/media/exercises/pushups.mp4", poster: "/media/exercises/pushups.jpg" },
  },
  {
    slug: "pullups",
    name: "Pull-up",
    category: "Upper body",
    muscles: ["Lats", "Biceps", "Upper back", "Grip"],
    unit: "reps",
    summary: "Hang, pull, chin over the bar. Back and arms do the work.",
    cues: [
      "Start from a dead hang with your arms straight.",
      "Pull your shoulder blades down before your elbows bend.",
      "Drive your elbows toward your back pockets.",
      "Chin clears the bar, then lower all the way under control.",
    ],
    mistakes: ["Kipping or swinging to cheat the top.", "Stopping halfway down.", "Shrugging the shoulders up to the ears."],
    video: { src: "/media/exercises/pullups.mp4", poster: "/media/exercises/pullups.jpg" },
  },
  {
    slug: "squats",
    name: "Squat",
    category: "Lower body",
    muscles: ["Quads", "Glutes", "Hamstrings", "Core"],
    unit: "reps",
    summary: "Sit back, stand up. The base of nearly every leg day.",
    cues: [
      "Feet about shoulder width, toes turned out slightly.",
      "Sit your hips back and down, chest up.",
      "Knees track over your toes.",
      "Push the floor away through your whole foot to stand.",
    ],
    mistakes: ["Heels lifting off the floor.", "Knees caving in on the way up.", "Rounding the lower back at the bottom."],
    video: { src: "/media/exercises/squats.mp4", poster: "/media/exercises/squats.jpg" },
  },
  {
    slug: "plank",
    name: "Plank",
    category: "Core",
    muscles: ["Abs", "Obliques", "Shoulders", "Glutes"],
    unit: "seconds",
    summary: "Hold still and brace. Harder than it looks after a minute.",
    cues: [
      "Elbows under your shoulders, forearms flat.",
      "Squeeze your glutes and thighs.",
      "Pull your belly button toward your spine.",
      "Breathe steadily. Don't hold your breath.",
    ],
    mistakes: ["Hips piking up high.", "Lower back sagging.", "Looking up and straining the neck."],
    video: { src: "/media/exercises/plank.mp4", poster: "/media/exercises/plank.jpg" },
  },
  {
    slug: "jumping-jacks",
    name: "Jumping jack",
    category: "Cardio",
    muscles: ["Calves", "Shoulders", "Hip abductors"],
    unit: "reps",
    summary: "The classic warm-up that quietly gets your heart rate up.",
    cues: [
      "Land softly on the balls of your feet.",
      "Arms go fully overhead, legs just past shoulder width.",
      "Keep a steady rhythm you can hold.",
    ],
    mistakes: ["Landing flat-footed and heavy.", "Arms only going halfway up."],
    video: { src: "/media/exercises/jumping-jacks.mp4", poster: "/media/exercises/jumping-jacks.jpg" },
  },
  {
    slug: "burpees",
    name: "Burpee",
    category: "Full body",
    muscles: ["Chest", "Quads", "Shoulders", "Core"],
    unit: "reps",
    summary: "Squat, plank, push-up, jump. Everything at once.",
    cues: [
      "Squat down and put your hands on the floor.",
      "Jump your feet back into a strong plank.",
      "Chest to the floor, then press up.",
      "Jump your feet in and explode up, arms overhead.",
    ],
    mistakes: ["Sagging hips in the plank.", "Skipping the jump at the top.", "Landing with locked knees."],
    video: { src: "/media/exercises/burpees.mp4", poster: "/media/exercises/burpees.jpg" },
  },
  {
    slug: "lunges",
    name: "Lunge",
    category: "Lower body",
    muscles: ["Quads", "Glutes", "Hamstrings"],
    unit: "reps",
    summary: "One leg at a time. Balance, strength and a lot of glute.",
    cues: [
      "Take a long step forward.",
      "Lower until both knees are at about 90 degrees.",
      "Front knee stays over the ankle.",
      "Push through the front heel to come back.",
    ],
    mistakes: ["Front knee shooting past the toes.", "Leaning the torso forward.", "Steps too short to bend properly."],
    video: { src: "/media/exercises/lunges.mp4", poster: "/media/exercises/lunges.jpg" },
  },
  {
    slug: "mountain-climbers",
    name: "Mountain climber",
    category: "Cardio",
    muscles: ["Core", "Shoulders", "Hip flexors"],
    unit: "reps",
    summary: "A plank that runs. Core and cardio in one.",
    cues: [
      "Start in a high plank, hands under shoulders.",
      "Drive one knee toward your chest, then switch fast.",
      "Keep your hips level with your shoulders.",
    ],
    mistakes: ["Hips bouncing up and down.", "Shoulders drifting behind the hands."],
    video: { src: "/media/exercises/mountain-climbers.mp4", poster: "/media/exercises/mountain-climbers.jpg" },
  },
  {
    slug: "glute-bridges",
    name: "Glute bridge",
    category: "Lower body",
    muscles: ["Glutes", "Hamstrings", "Lower back"],
    unit: "reps",
    summary: "Lie back, lift the hips. Kind on the knees, tough on the glutes.",
    cues: [
      "Lie on your back, knees bent, feet flat and hip-width.",
      "Press through your heels to lift your hips.",
      "Squeeze your glutes hard at the top.",
      "Lower slowly, one vertebra at a time.",
    ],
    mistakes: ["Arching the lower back instead of using the glutes.", "Feet too far from the hips."],
    video: { src: "/media/exercises/glute-bridges.mp4", poster: "/media/exercises/glute-bridges.jpg" },
  },
  {
    slug: "hundred",
    name: "The Hundred",
    plural: "The Hundred",
    category: "Pilates",
    muscles: ["Deep core", "Abdominals", "Shoulders"],
    unit: "reps",
    summary: "The classic Pilates opener. A hundred arm pumps while your middle holds everything still.",
    cues: [
      "Lie on your back and lift your knees to tabletop, shins parallel to the floor.",
      "Curl your head, neck and shoulders off the mat and look towards your stomach.",
      "Stretch your arms long beside your hips, then pump them from the shoulder a few inches up and down.",
      "Breathe in for five pumps and out for five. Ten rounds gets you to a hundred.",
    ],
    mistakes: [
      "Pulling on the neck instead of lifting with the stomach.",
      "Pumping from the elbows rather than the whole arm.",
      "Letting the lower back peel away from the mat.",
    ],
  },
  {
    slug: "roll-up",
    name: "Roll-Up",
    category: "Pilates",
    muscles: ["Abdominals", "Spine", "Hip flexors"],
    unit: "reps",
    summary: "One slow curl from lying flat to sitting tall. It finds every weak spot between your ribs and hips.",
    cues: [
      "Lie flat with your arms stretched overhead and your legs straight and together.",
      "Reach your arms to the ceiling, then peel your spine off the mat one bone at a time.",
      "Keep rolling until you are sitting tall and reaching past your toes.",
      "Come back down just as slowly. The slower you go, the harder it works.",
    ],
    mistakes: [
      "Throwing the arms to build momentum.",
      "Feet lifting off the floor on the way up.",
      "Dropping back down in one piece instead of lowering bone by bone.",
    ],
  },
  {
    slug: "single-leg-circles",
    name: "Single Leg Circles",
    plural: "Single Leg Circles",
    category: "Pilates",
    muscles: ["Deep core", "Hip flexors", "Glutes"],
    unit: "reps",
    summary: "One leg draws circles while the rest of you refuses to move. Hip control in its purest form.",
    cues: [
      "Lie on your back with one leg stretched to the ceiling and the other long on the mat.",
      "Press both hips into the floor and keep them there for the whole set.",
      "Draw a circle the size of a dinner plate with the raised leg, crossing the body first.",
      "Do five circles each way, then swap legs.",
    ],
    mistakes: [
      "Rocking the hips to make the circle bigger.",
      "Letting the bottom leg drift or bend.",
      "Going so fast the shape stops being a circle.",
    ],
  },
  {
    slug: "rolling-like-a-ball",
    name: "Rolling Like a Ball",
    plural: "Rolling Like a Ball",
    category: "Pilates",
    muscles: ["Abdominals", "Spine", "Deep core"],
    unit: "reps",
    summary: "Tuck up small and roll. A massage for your spine that also teaches your core to hold one shape.",
    cues: [
      "Sit near the front of the mat, knees tucked in, hands holding your shins.",
      "Round your back into a C shape and lift your feet so you balance behind your tailbone.",
      "Breathe in and roll back to your shoulder blades, never onto your neck.",
      "Breathe out and roll straight back up to the same balance point.",
    ],
    mistakes: [
      "Rolling so far back that the weight lands on the neck.",
      "Letting the shape open up mid-roll so you cannot get back up.",
      "Using a leg kick instead of the stomach to come up.",
    ],
  },
  {
    slug: "single-leg-stretch",
    name: "Single Leg Stretch",
    plural: "Single Leg Stretches",
    category: "Pilates",
    muscles: ["Abdominals", "Deep core", "Hip flexors"],
    unit: "reps",
    summary: "Swap one knee in for the other while your shoulders stay lifted. Simple, and it burns quickly.",
    cues: [
      "Curl your head and shoulders up, both knees in tabletop.",
      "Pull one knee towards your chest, outside hand on the ankle and inside hand on the knee.",
      "Stretch the other leg out at about 45 degrees, as low as you can keep your back flat.",
      "Switch sides smoothly, as if the legs pass each other in the middle.",
    ],
    mistakes: [
      "The lower back arching when the long leg drops too low.",
      "Shoulders sinking back to the mat halfway through the set.",
      "Yanking the knee in with the arms instead of the stomach.",
    ],
  },
  {
    slug: "double-leg-stretch",
    name: "Double Leg Stretch",
    plural: "Double Leg Stretches",
    category: "Pilates",
    muscles: ["Abdominals", "Deep core", "Shoulders"],
    unit: "reps",
    summary: "Stretch long in every direction, then pull back into a tight ball. Full core under constant tension.",
    cues: [
      "Start curled up, knees into your chest and hands on your shins.",
      "Breathe in and reach your arms past your ears while your legs stretch away.",
      "Keep your lower back pressed into the mat the whole time you are long.",
      "Breathe out, circle the arms around and pull the knees back in.",
    ],
    mistakes: [
      "Ribs popping up as the arms reach back.",
      "Taking the legs lower than your back can hold.",
      "Letting the head drop between reaches.",
    ],
  },
  {
    slug: "criss-cross",
    name: "Criss-Cross",
    plural: "Criss-Crosses",
    category: "Pilates",
    muscles: ["Obliques", "Abdominals", "Deep core"],
    unit: "reps",
    summary: "A slow bicycle with the brakes on. The one that finds the muscles down the sides of your waist.",
    cues: [
      "Hands behind your head, elbows wide, head and shoulders curled up.",
      "Bring one knee in and turn your chest towards it, not just your elbow.",
      "Stretch the other leg long and low, and hold the twist for a breath.",
      "Rotate through the middle slowly to the other side.",
    ],
    mistakes: [
      "Pulling the head forward with the hands.",
      "Rushing so it becomes elbows flapping rather than a twist.",
      "Elbows closing in and hiding how far you actually turned.",
    ],
  },
  {
    slug: "spine-stretch-forward",
    name: "Spine Stretch Forward",
    plural: "Spine Stretch Forward",
    category: "Pilates",
    muscles: ["Spine", "Hamstrings", "Abdominals"],
    unit: "reps",
    summary: "Sit tall, then curl over as if folding over a beach ball. Length for your back, work for your middle.",
    cues: [
      "Sit tall with your legs straight and a bit wider than your hips, feet flexed.",
      "Reach your arms forward at shoulder height and grow as tall as you can.",
      "Breathe out and curl down from the top of your head, one bone at a time.",
      "Stack back up slowly, hips last.",
    ],
    mistakes: [
      "Bending from the hips instead of curling the spine.",
      "Collapsing the chest and calling it a stretch.",
      "Knees rolling inwards as you fold.",
    ],
  },
  {
    slug: "saw",
    name: "The Saw",
    plural: "The Saw",
    category: "Pilates",
    muscles: ["Obliques", "Hamstrings", "Spine"],
    unit: "reps",
    summary: "Twist, then reach past your foot. It wrings out your waist and opens your back at the same time.",
    cues: [
      "Sit tall, legs wide and straight, arms out to the sides at shoulder height.",
      "Turn your chest to one side, keeping both hips planted on the mat.",
      "Curl forward and reach your little finger past your little toe, three small reaches.",
      "Roll back up through the spine and untwist to the middle before swapping sides.",
    ],
    mistakes: [
      "The opposite hip lifting as you turn.",
      "Twisting from the arms rather than the ribs.",
      "Bouncing into the reach instead of breathing out into it.",
    ],
  },
  {
    slug: "swan",
    name: "Swan",
    category: "Pilates",
    muscles: ["Upper back", "Glutes", "Shoulders"],
    unit: "reps",
    summary: "The antidote to a day at a desk. Everything on the front opens while your back learns to lift.",
    cues: [
      "Lie face down, hands under your shoulders, elbows close to your ribs.",
      "Draw your shoulders down away from your ears before you lift anything.",
      "Lead with your chest and lift to where your back does the work, not your arms.",
      "Lower down in the same order, chest last.",
    ],
    mistakes: [
      "Pushing up with the arms and cranking the lower back.",
      "Shoulders bunching up by the ears.",
      "Letting the legs and glutes go soft.",
    ],
  },
  {
    slug: "side-kick-series",
    name: "Side Kick Series",
    plural: "Side Kick Series",
    category: "Pilates",
    muscles: ["Glutes", "Hips", "Obliques"],
    unit: "reps",
    summary: "Lie on your side and move one leg while nothing else does. Where most people find their glutes.",
    cues: [
      "Lie on one side with your body in a straight line along the back edge of the mat.",
      "Lift the top leg to hip height and keep it there between reps.",
      "Swing it forward with control, then sweep it back behind you without the hips rolling.",
      "Keep a small lift under your bottom waist so your body never sags into the mat.",
    ],
    mistakes: [
      "Hips rocking back and forth with the leg.",
      "Kicking higher than your control allows.",
      "Resting the whole body weight on the bottom shoulder.",
    ],
  },
  {
    slug: "swimming",
    name: "Swimming",
    category: "Pilates",
    muscles: ["Back", "Glutes", "Shoulders", "Hamstrings"],
    unit: "seconds",
    summary: "Face down, opposite arm and leg fluttering. Your back, glutes and shoulders working all at once.",
    cues: [
      "Lie face down with your arms stretched past your ears and your legs long.",
      "Lift both arms, both legs and your chest off the mat.",
      "Flutter opposite arm and leg in small, quick beats.",
      "Breathe in for five beats and out for five, and keep your neck long.",
    ],
    mistakes: [
      "Crunching the lower back instead of lengthening away from the hips.",
      "Beats so big the whole body rocks.",
      "Dropping the chest after the first few seconds.",
    ],
  },
  {
    slug: "teaser",
    name: "Teaser",
    category: "Pilates",
    muscles: ["Abdominals", "Deep core", "Hip flexors"],
    unit: "reps",
    summary: "The one everyone photographs. Roll up into a V and hold it, with nothing but your middle holding you there.",
    cues: [
      "Start lying down with your legs straight out at an angle you can hold still.",
      "Reach your arms past your ears, then peel up one bone at a time.",
      "Balance just behind your tailbone with your arms reaching along your legs.",
      "Roll back down with the same control, legs as steady as when you came up.",
    ],
    mistakes: [
      "Swinging the arms to get up.",
      "The legs dropping or swinging as you lift.",
      "Landing back down in one heavy piece.",
    ],
  },
];

export function getExercise(slug: string) {
  return exercises.find((e) => e.slug === slug);
}
