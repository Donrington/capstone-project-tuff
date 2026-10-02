/**
 * The exercise library (#21). Static content, not user data, so client and
 * server components can both import it directly.
 *
 * Adding a clip later: put `<slug>.mp4` and `<slug>.jpg` in
 * public/media/exercises/ and fill in `video`. Nothing else changes.
 */

export type ExerciseCategory = "Upper body" | "Lower body" | "Core" | "Full body" | "Cardio";

export interface Exercise {
  slug: string;
  name: string;
  category: ExerciseCategory;
  muscles: string[];
  unit: "reps" | "seconds";
  /** One line for the card. */
  summary: string;
  cues: string[];
  mistakes: string[];
  video?: { src: string; poster: string };
}

export const EXERCISE_CATEGORIES: ExerciseCategory[] = ["Upper body", "Lower body", "Core", "Full body", "Cardio"];

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
];

export function getExercise(slug: string) {
  return exercises.find((e) => e.slug === slug);
}
