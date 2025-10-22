// src/lib/vision.js
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs";

let cocoModel = null;

export async function loadCoco() {
  if (cocoModel) return cocoModel;
  // Lite MobileNet is small and fast; good for browsers
  cocoModel = await cocoSsd.load({ base: "lite_mobilenet_v2" });
  return cocoModel;
}

// Detect basic food-related objects and presence of a person
export async function detectFoodAndPerson(imgElOrCanvas) {
  const model = await loadCoco();
  const predictions = await model.detect(imgElOrCanvas);

  const hasPerson = predictions.some(
    (p) => p.class === "person" && p.score >= 0.6
  );

  // COCO classes that correlate with meals/food/tableware
  const FOOD_CLASSES = new Set([
    "banana",
    "apple",
    "sandwich",
    "orange",
    "broccoli",
    "carrot",
    "hot dog",
    "pizza",
    "donut",
    "cake",
    "bowl",
    "cup",
    "fork",
    "knife",
    "spoon",
    "bottle",
    "wine glass",
    "dining table",
  ]);

  const hits = predictions.filter(
    (p) => p.score >= 0.5 && FOOD_CLASSES.has(p.class)
  );

  const classes = new Set(hits.map((h) => h.class));
  // “food items” exclude pure tableware to avoid false positives
  const foodItems = hits.filter(
    (h) =>
      ![
        "bowl",
        "cup",
        "fork",
        "knife",
        "spoon",
        "bottle",
        "wine glass",
        "dining table",
      ].includes(h.class)
  );

  // Heuristic for “meal likely”: at least one food item OR bowl+utensils/table
  const mealLikely =
    foodItems.length >= 1 ||
    (classes.has("bowl") &&
      (classes.has("dining table") ||
        classes.has("fork") ||
        classes.has("spoon")));

  return {
    hasPerson,
    mealLikely,
    classes: [...classes],
  };
}
