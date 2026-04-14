"use client";

import { useMemo, useState } from "react";

const ingredients = [
  { key: "farine", label: "Farine", unit: "g", min: 0, max: 600, step: 10, defaultValue: 200 },
  { key: "sucre", label: "Sucre", unit: "g", min: 0, max: 300, step: 5, defaultValue: 40 },
  { key: "sel", label: "Sel", unit: "g", min: 0, max: 20, step: 1, defaultValue: 2 },
  { key: "oeufs", label: "Oeufs", unit: "unites", min: 0, max: 8, step: 1, defaultValue: 2 },
  { key: "lait", label: "Lait", unit: "ml", min: 0, max: 800, step: 10, defaultValue: 300 },
  { key: "beurre", label: "Beurre", unit: "g", min: 0, max: 250, step: 5, defaultValue: 30 },
  { key: "levure", label: "Levure", unit: "g", min: 0, max: 30, step: 1, defaultValue: 4 },
  { key: "cacao", label: "Cacao en poudre", unit: "g", min: 0, max: 120, step: 5, defaultValue: 0 },
  { key: "chocolat", label: "Pepites de chocolat", unit: "g", min: 0, max: 300, step: 5, defaultValue: 0 },
  { key: "chocolatFondu", label: "Chocolat fondu", unit: "g", min: 0, max: 250, step: 5, defaultValue: 0 },
];

const recipes = [
  {
    name: "Crepes",
    description: "Pate fluide, cuisson rapide a la poele.",
    targets: { farine: 250, sucre: 30, sel: 2, oeufs: 3, lait: 500, beurre: 40, levure: 0, cacao: 0, chocolat: 0, chocolatFondu: 0 },
  },
  {
    name: "Gateau nature",
    description: "Mie moelleuse, cuisson au four.",
    targets: { farine: 200, sucre: 160, sel: 2, oeufs: 3, lait: 120, beurre: 120, levure: 10, cacao: 0, chocolat: 0, chocolatFondu: 0 },
  },
  {
    name: "Cookies",
    description: "Pate epaisse et croustillante avec pepites.",
    targets: { farine: 250, sucre: 140, sel: 2, oeufs: 2, lait: 20, beurre: 130, levure: 5, cacao: 0, chocolat: 180, chocolatFondu: 40 },
  },
  {
    name: "Muffins",
    description: "Portions individuelles aeriennes.",
    targets: { farine: 220, sucre: 120, sel: 2, oeufs: 2, lait: 180, beurre: 100, levure: 10, cacao: 15, chocolat: 60, chocolatFondu: 0 },
  },
  {
    name: "Brownie",
    description: "Texture fondante, riche en chocolat.",
    targets: { farine: 120, sucre: 180, sel: 2, oeufs: 3, lait: 40, beurre: 170, levure: 2, cacao: 35, chocolat: 120, chocolatFondu: 120 },
  },
  {
    name: "Quatre-quarts",
    description: "Recette bretonne classique, dense et moelleuse.",
    targets: { farine: 180, sucre: 180, sel: 2, oeufs: 3, lait: 20, beurre: 180, levure: 4, cacao: 0, chocolat: 0, chocolatFondu: 0 },
  },
  {
    name: "Madeleines",
    description: "Petits gateaux legerement bombes et parfumes.",
    targets: { farine: 180, sucre: 130, sel: 1, oeufs: 3, lait: 50, beurre: 120, levure: 6, cacao: 0, chocolat: 0, chocolatFondu: 0 },
  },
  {
    name: "Pancakes",
    description: "Pate epaisse pour des pancakes moelleux.",
    targets: { farine: 250, sucre: 35, sel: 2, oeufs: 2, lait: 320, beurre: 45, levure: 12, cacao: 0, chocolat: 0, chocolatFondu: 0 },
  },
  {
    name: "Cake marbre",
    description: "Cake vanille-chocolat a mie tendre.",
    targets: { farine: 210, sucre: 160, sel: 2, oeufs: 3, lait: 90, beurre: 140, levure: 8, cacao: 20, chocolat: 70, chocolatFondu: 50 },
  },
  {
    name: "Financiers",
    description: "Petits gateaux moelleux, legerement dores.",
    targets: { farine: 110, sucre: 150, sel: 1, oeufs: 3, lait: 30, beurre: 140, levure: 2, cacao: 10, chocolat: 20, chocolatFondu: 0 },
  },
];

const MIN_CONFIDENCE_FOR_KNOWN_RECIPE = 95;

const buildDefaultValues = () =>
  ingredients.reduce((acc, ingredient) => {
    acc[ingredient.key] = ingredient.defaultValue;
    return acc;
  }, {});

const clampToRange = (value, min, max) => Math.min(max, Math.max(min, value));

const roundToStep = (value, min, step) => {
  if (!step) {
    return value;
  }
  return min + Math.round((value - min) / step) * step;
};

const roundToStepByDirection = (value, min, step, ratio) => {
  if (!step) {
    return value;
  }

  const stepUnits = (value - min) / step;
  if (ratio >= 1) {
    return min + Math.ceil(stepUnits) * step;
  }
  return min + Math.floor(stepUnits) * step;
};

const toRatios = (source) => {
  const total = ingredients.reduce((sum, ingredient) => sum + Math.max(0, source[ingredient.key] ?? 0), 0);
  if (total <= 0) {
    return ingredients.reduce((acc, ingredient) => {
      acc[ingredient.key] = 0;
      return acc;
    }, {});
  }

  return ingredients.reduce((acc, ingredient) => {
    const value = Math.max(0, source[ingredient.key] ?? 0);
    acc[ingredient.key] = value / total;
    return acc;
  }, {});
};

const completeTargets = (targets) =>
  ingredients.reduce((acc, ingredient) => {
    acc[ingredient.key] = targets[ingredient.key] ?? 0;
    return acc;
  }, {});

export default function Home() {
  const [values, setValues] = useState(buildDefaultValues);
  const [selectedRecipeName, setSelectedRecipeName] = useState(null);
  const [isLocked, setIsLocked] = useState(false);

  const bestMatch = useMemo(() => {
    const selectedRatios = toRatios(values);
    let bestRecipe = recipes[0];
    let highestConfidence = -1;

    for (const recipe of recipes) {
      const recipeRatios = toRatios(completeTargets(recipe.targets));
      let ratioDistance = 0;

      for (const ingredient of ingredients) {
        ratioDistance += Math.abs((selectedRatios[ingredient.key] ?? 0) - (recipeRatios[ingredient.key] ?? 0));
      }

      // L1 distance between two distributions is in [0, 2].
      const confidence = Math.max(0, Math.round((1 - ratioDistance / 2) * 100));

      if (confidence > highestConfidence) {
        highestConfidence = confidence;
        bestRecipe = recipe;
      }
    }

    return { ...bestRecipe, confidence: highestConfidence };
  }, [values]);

  const isKnownRecipe = bestMatch.confidence >= MIN_CONFIDENCE_FOR_KNOWN_RECIPE;
  const selectedRecipe = recipes.find((recipe) => recipe.name === selectedRecipeName);
  const displayedRecipe = selectedRecipe ?? (isKnownRecipe ? bestMatch : null);

  const handleSliderChange = (ingredientKey, nextValue) => {
    setValues((prev) => {
      if (!isLocked) {
        return {
          ...prev,
          [ingredientKey]: nextValue,
        };
      }

      const currentIngredient = ingredients.find((ingredient) => ingredient.key === ingredientKey);
      if (!currentIngredient) {
        return prev;
      }

      const currentValue = prev[ingredientKey] ?? currentIngredient.defaultValue;
      const ratio = currentValue === 0 ? 1 : nextValue / currentValue;
      const updatedValues = { ...prev, [ingredientKey]: nextValue };

      for (const ingredient of ingredients) {
        if (ingredient.key === ingredientKey) {
          continue;
        }

        const currentIngredientValue = prev[ingredient.key] ?? ingredient.defaultValue;
        const baseValue = currentIngredientValue === 0 ? ingredient.defaultValue : currentIngredientValue;
        const scaledValue = baseValue * ratio;
        const steppedValue = roundToStepByDirection(
          scaledValue,
          ingredient.min,
          ingredient.step,
          ratio,
        );
        updatedValues[ingredient.key] = clampToRange(steppedValue, ingredient.min, ingredient.max);
      }

      return updatedValues;
    });
    setSelectedRecipeName(null);
  };

  return (
    <main style={{ minHeight: "100vh", padding: "clamp(0.9rem, 3vw, 2rem)", background: "#fffaf3" }}>
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          display: "grid",
          gap: "1.5rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          alignItems: "start",
        }}
      >
        <section
          style={{
            background: "#fffefb",
            borderRadius: "16px",
            padding: "clamp(1rem, 3vw, 1.5rem)",
            boxShadow: "0 8px 24px rgba(92, 63, 35, 0.12)",
          }}
        >
          <h1 style={{ fontSize: "clamp(1.6rem, 5vw, 1.9rem)", marginBottom: "0.3rem" }}>Sweet Slider</h1>
          <p style={{ color: "#6f543b", marginBottom: "1.3rem" }}>
            Ajuste chaque ingredient pour approcher une recette de patisserie.
          </p>

          <div style={{ marginBottom: "1.2rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                rowGap: "0.5rem",
                columnGap: "0.75rem",
                marginBottom: "0.5rem",
              }}
            >
              <h2 style={{ fontSize: "1.1rem", margin: 0 }}>Presets recettes</h2>
              <button
                type="button"
                onClick={() => setIsLocked((prev) => !prev)}
                style={{
                  border: "1px solid",
                  borderColor: isLocked ? "#16a34a" : "#cbd5e1",
                  background: isLocked ? "#dcfce7" : "#f8fafc",
                  color: isLocked ? "#166534" : "#0f172a",
                  borderRadius: "999px",
                  padding: "0.35rem 0.75rem",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                LOCK: {isLocked ? "ON" : "OFF"}
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {recipes.map((recipe) => (
                <button
                  key={recipe.name}
                  type="button"
                  onClick={() => {
                    setValues(completeTargets(recipe.targets));
                    setSelectedRecipeName(recipe.name);
                  }}
                  style={{
                    border: "1px solid #d6c3ab",
                    background: "#fff8ee",
                    color: "#4d3420",
                    borderRadius: "999px",
                    padding: "0.35rem 0.75rem",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  {recipe.name}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gap: "1rem" }}>
            {ingredients.map((ingredient) => (
              <label key={ingredient.key} style={{ display: "grid", gap: "0.4rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
                  <span>{ingredient.label}</span>
                  <span>
                    {values[ingredient.key]} {ingredient.unit}
                  </span>
                </div>
                <input
                  type="range"
                  min={ingredient.min}
                  max={ingredient.max}
                  step={ingredient.step}
                  value={values[ingredient.key]}
                  onChange={(event) => handleSliderChange(ingredient.key, Number(event.target.value))}
                />
              </label>
            ))}
          </div>
        </section>

        <aside
          style={{
            background: "#4a3320",
            color: "#f8efe4",
            borderRadius: "16px",
            padding: "clamp(1rem, 3vw, 1.5rem)",
            boxShadow: "0 8px 24px rgba(92, 63, 35, 0.28)",
          }}
        >
          <p style={{ color: "#e2ccb5", marginBottom: "0.5rem" }}>Recette la plus proche</p>
          <h2 style={{ fontSize: "clamp(1.7rem, 7vw, 2rem)", marginBottom: "0.5rem" }}>
            {displayedRecipe ? displayedRecipe.name : "Recette inconnue"}
          </h2>
          <p style={{ marginBottom: "1.2rem", color: "#f0dfcc" }}>
            {displayedRecipe
              ? displayedRecipe.description
              : `Aucune recette ne correspond assez (minimum ${MIN_CONFIDENCE_FOR_KNOWN_RECIPE}%). Essaie un preset ou ajuste les sliders.`}
          </p>
          <p style={{ marginBottom: "1rem" }}>Compatibilite: {bestMatch.confidence}%</p>

          <div style={{ display: "grid", gap: "0.75rem" }}>
            <div
              style={{
                opacity: displayedRecipe ? 1 : 0,
                transform: displayedRecipe ? "translateY(0)" : "translateY(8px)",
                maxHeight: displayedRecipe ? "420px" : "0px",
                overflow: "hidden",
                transition: "opacity 280ms ease, transform 280ms ease, max-height 280ms ease",
                pointerEvents: displayedRecipe ? "auto" : "none",
              }}
            >
              <h3 style={{ marginBottom: "0.6rem" }}>Reference de cette recette</h3>
              <ul style={{ display: "grid", gap: "0.45rem", listStyle: "none", padding: 0 }}>
                {ingredients.map((ingredient) => (
                  <li key={ingredient.key} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #6f4f33", paddingBottom: "0.25rem" }}>
                    <span>{ingredient.label}</span>
                    <span>
                      {displayedRecipe ? (displayedRecipe.targets[ingredient.key] ?? 0) : 0} {ingredient.unit}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <p
              style={{
                color: "#e2ccb5",
                opacity: displayedRecipe ? 0 : 1,
                transform: displayedRecipe ? "translateY(-8px)" : "translateY(0)",
                maxHeight: displayedRecipe ? "0px" : "48px",
                overflow: "hidden",
                transition: "opacity 280ms ease, transform 280ms ease, max-height 280ms ease",
              }}
            >
              Recette la plus proche actuellement: {bestMatch.name}
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
