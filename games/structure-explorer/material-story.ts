import type { Material } from './data/materials';

const icons: Record<string, string> = {
  tree: 'M12 21v-7m-8 1 8-12 8 12Z',
  slats: 'M3 7h18v5H3zm0 8h18v5H3zM6 9h6m2 8h4',
  groove: 'M3 7v11h18V7M3 7h5a4 4 0 0 0 8 0h5',
  press: 'M3 3h18M12 3v9m-3-3 3 3 3-3M4 15h16v5H4z',
  mine: 'm2 19 5-9 4 4 5-10 6 15Zm11-4 3-5 3 5',
  sieve: 'M3 7h18l-3 7H6Zm5 11v2m4-2v2m4-2v2',
  mix: 'M4 12h16l-3 8H7zm6 0 5-9m-2 4 4 2',
  kiln: 'M4 21V9a8 8 0 0 1 16 0v12Zm5-4c-2-3 2-4 2-7 4 3 5 6 2 8',
  coat: 'M4 4h16v6H4zm16 3h2v7H12v7m-2-5h4v6h-4z',
  stamp: 'M4 18h16v3H4zm2 0v-5h4V7a2 2 0 0 1 4 0v6h4v5',
};

export function materialIcon(id: string) {
  return `<svg class="material-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[id]}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

export function swatch(color: string) {
  return `<span class="material-swatch" style="--swatch:${color}" aria-hidden="true"></span>`;
}

export function materialStory(material: Material) {
  return `<p class="material-source">${material.sourceHeadline}</p>
    <ul class="material-traits" aria-label="材料特性">${material.traits.map(trait => `<li>${trait}</li>`).join('')}</ul>
    <ol class="origin-steps">${material.originSteps.map((step, index) => `<li>
      ${materialIcon(step.iconId)}<div><div class="origin-stage">${index + 1} · ${step.stage}</div>
      <strong>${step.title}</strong><p>${step.detail}</p></div></li>`).join('')}</ol>
    <details class="material-quiz"><summary>考考你 · ${material.whyThisMaterial.question}</summary>
    <p>${material.whyThisMaterial.answer}</p></details>
    <p class="material-boundary">${material.scienceNote}</p>`;
}
