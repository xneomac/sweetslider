"use client";

import { useEffect, useMemo, useState } from "react";

const ingredients = [
  { key: "farine", label: "Farine", unit: "g", min: 0, max: 600, step: 10, defaultValue: 200 },
  { key: "sucre", label: "Sucre", unit: "g", min: 0, max: 300, step: 5, defaultValue: 40 },
  { key: "sel", label: "Sel", unit: "g", min: 0, max: 20, step: 1, defaultValue: 2 },
  { key: "oeufs", label: "Oeufs", unit: "unites", min: 0, max: 8, step: 1, defaultValue: 2 },
  { key: "lait", label: "Lait", unit: "ml", min: 0, max: 800, step: 10, defaultValue: 300 },
  { key: "beurre", label: "Beurre", unit: "g", min: 0, max: 250, step: 5, defaultValue: 30 },
  { key: "levure", label: "Levure", unit: "g", min: 0, max: 30, step: 1, defaultValue: 4 },
  { key: "chocolat", label: "Pepites de chocolat", unit: "g", min: 0, max: 300, step: 5, defaultValue: 0 },
];

const recipes = [
  {
    name: "Crepes",
    description: "Pate fluide, cuisson rapide a la poele.",
    targets: { farine: 250, sucre: 30, sel: 2, oeufs: 3, lait: 500, beurre: 40, levure: 0, chocolat: 0 },
  },
  {
    name: "Gateau nature",
    description: "Mie moelleuse, cuisson au four.",
    targets: { farine: 200, sucre: 160, sel: 2, oeufs: 3, lait: 120, beurre: 120, levure: 10, chocolat: 0 },
  },
  {
    name: "Cookies",
    description: "Pate epaisse et croustillante avec pepites.",
    targets: { farine: 250, sucre: 140, sel: 2, oeufs: 2, lait: 20, beurre: 130, levure: 5, chocolat: 180 },
  },
  {
    name: "Muffins",
    description: "Portions individuelles aeriennes.",
    targets: { farine: 220, sucre: 120, sel: 2, oeufs: 2, lait: 180, beurre: 100, levure: 10, chocolat: 60 },
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

export default function Home() {
  const [values, setValues] = useState(buildDefaultValues);
  const [selectedRecipeName, setSelectedRecipeName] = useState(null);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    // Keep slider UI and displayed values in sync after browser restores form state.
    setValues(buildDefaultValues());
  }, []);

  const recipeScores = useMemo(
    () =>
      recipes.map((recipe) => {
        let distance = 0;

        for (const ingredient of ingredients) {
          const target = recipe.targets[ingredient.key] ?? 0;
          const selected = values[ingredient.key] ?? 0;
          const normalizer = Math.max(ingredient.max, target, 1);
          distance += Math.abs(selected - target) / normalizer;
        }

        const confidence = Math.max(0, Math.round((1 - distance / ingredients.length) * 100));
        return { ...recipe, confidence };
      }),
    [values],
  );

  const bestMatch = recipeScores.reduce((best, current) =>
    current.confidence > best.confidence ? current : best,
  );
  const isKnownRecipe = bestMatch.confidence >= MIN_CONFIDENCE_FOR_KNOWN_RECIPE;
  const selectedRecipe = recipes.find((recipe) => recipe.name === selectedRecipeName);
  const displayedRecipe = isKnownRecipe ? selectedRecipe ?? bestMatch : null;

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
        const scaledValue = currentIngredientValue * ratio;
        const steppedValue = roundToStep(scaledValue, ingredient.min, ingredient.step);
        updatedValues[ingredient.key] = clampToRange(steppedValue, ingredient.min, ingredient.max);
      }

      return updatedValues;
    });
    setSelectedRecipeName(null);
  };

  return (
    <main style={{ minHeight: "100vh", padding: "2rem", background: "#f8fafc" }}>
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          display: "grid",
          gap: "1.5rem",
          gridTemplateColumns: "1.2fr 1fr",
        }}
      >
        <section style={{ background: "white", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 8px 24px rgba(0, 0, 0, 0.06)" }}>
          <h1 style={{ fontSize: "1.8rem", marginBottom: "0.3rem" }}>Sweet Slider</h1>
          <p style={{ color: "#475569", marginBottom: "1.3rem" }}>
            Ajuste chaque ingredient pour approcher une recette de patisserie.
          </p>

          <div style={{ marginBottom: "1.2rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "0.5rem" }}>
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
                    setValues(recipe.targets);
                    setSelectedRecipeName(recipe.name);
                  }}
                  style={{
                    border: "1px solid #cbd5e1",
                    background: "#f8fafc",
                    color: "#0f172a",
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
                <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", fontSize: "0.8rem" }}>
                  <span>
                    Min: {ingredient.min} {ingredient.unit}
                  </span>
                  <span>
                    Max: {ingredient.max} {ingredient.unit}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </section>

        <aside style={{ background: "#0f172a", color: "#e2e8f0", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 8px 24px rgba(0, 0, 0, 0.1)" }}>
          <p style={{ color: "#94a3b8", marginBottom: "0.5rem" }}>Recette la plus proche</p>
          <h2 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
            {displayedRecipe ? displayedRecipe.name : "Recette inconnue"}
          </h2>
          <p style={{ marginBottom: "1.2rem", color: "#cbd5e1" }}>
            {displayedRecipe
              ? displayedRecipe.description
              : `Aucune recette ne correspond assez (minimum ${MIN_CONFIDENCE_FOR_KNOWN_RECIPE}%). Essaie un preset ou ajuste les sliders.`}
          </p>
          <p style={{ marginBottom: "1rem" }}>Compatibilite: {bestMatch.confidence}%</p>

          {displayedRecipe ? (
            <>
              <h3 style={{ marginBottom: "0.6rem" }}>Reference de cette recette</h3>
              <ul style={{ display: "grid", gap: "0.45rem", listStyle: "none", padding: 0 }}>
                {ingredients.map((ingredient) => (
                  <li key={ingredient.key} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #1e293b", paddingBottom: "0.25rem" }}>
                    <span>{ingredient.label}</span>
                    <span>
                      {displayedRecipe.targets[ingredient.key]} {ingredient.unit}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p style={{ color: "#94a3b8" }}>Recette la plus proche actuellement: {bestMatch.name}</p>
          )}
        </aside>
      </div>
    </main>
  );
}
