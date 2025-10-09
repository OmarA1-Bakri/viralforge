/**
 * Color System Test Component
 *
 * Displays all 70 color shades across 7 categories.
 * Used to verify:
 * - Perceptual uniformity (equal visual steps)
 * - WCAG accessibility (contrast ratios)
 * - Light/dark mode compatibility
 * - Tailwind utility class generation
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const colorCategories = [
  {
    name: "Primary (Cyan)",
    baseClass: "primary",
    description: "Brand color - SaaS platform identity",
  },
  {
    name: "Accent (Pink)",
    baseClass: "accent",
    description: "Secondary brand color - CTAs and highlights",
  },
  {
    name: "Gray",
    baseClass: "gray",
    description: "Neutral scale - 60% of interface",
  },
  {
    name: "Success (Green)",
    baseClass: "success",
    description: "Positive actions and states",
  },
  {
    name: "Warning (Orange)",
    baseClass: "warning",
    description: "Caution and alerts",
  },
  {
    name: "Info (Blue)",
    baseClass: "info",
    description: "Information and guidance",
  },
  {
    name: "Error (Red)",
    baseClass: "error",
    description: "Errors and destructive actions",
  },
];

const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

export function ColorSystemTest() {
  return (
    <div className="min-h-screen p-8 space-y-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">
            ViralForge Color System Test
          </h1>
          <p className="text-muted-foreground">
            Perceptually uniform 10-shade color scales (70 total colors)
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Generated using OKLCH color space for equal visual steps
          </p>
        </div>

        {/* Color Scales */}
        <div className="space-y-12">
          {colorCategories.map((category) => (
            <Card key={category.baseClass}>
              <CardHeader>
                <CardTitle>{category.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {category.description}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Color Swatches */}
                  <div className="grid grid-cols-10 gap-2">
                    {shades.map((shade) => {
                      const bgClass = `bg-${category.baseClass}-${shade}`;
                      const textClass =
                        shade >= 500 ? "text-white" : "text-gray-900";

                      return (
                        <div
                          key={shade}
                          className="flex flex-col items-center"
                        >
                          <div
                            className={`${bgClass} w-full aspect-square rounded-lg border border-border flex items-center justify-center ${textClass} font-medium text-sm`}
                          >
                            {shade === 500 ? "★" : shade}
                          </div>
                          <span className="text-xs text-muted-foreground mt-1">
                            {shade}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Continuous Gradient Test */}
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-2">
                      Perceptual Uniformity Test (should appear equal-stepped):
                    </p>
                    <div className="h-12 rounded-lg flex overflow-hidden border border-border">
                      {shades.map((shade) => (
                        <div
                          key={shade}
                          className={`flex-1 bg-${category.baseClass}-${shade}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Text Contrast Test */}
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-2">
                      WCAG Contrast Test (text on backgrounds):
                    </p>
                    <div className="grid grid-cols-5 gap-2">
                      {shades.slice(0, 5).map((shade) => (
                        <div
                          key={shade}
                          className={`bg-${category.baseClass}-${shade} p-4 rounded-lg border border-border`}
                        >
                          <p className="text-gray-900 text-sm font-medium">
                            Dark Text
                          </p>
                          <p className="text-gray-900 text-xs">AA test</p>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-5 gap-2 mt-2">
                      {shades.slice(5, 10).map((shade) => (
                        <div
                          key={shade}
                          className={`bg-${category.baseClass}-${shade} p-4 rounded-lg border border-border`}
                        >
                          <p className="text-white text-sm font-medium">
                            Light Text
                          </p>
                          <p className="text-white text-xs">AA test</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Usage Guide */}
        <Card className="mt-12">
          <CardHeader>
            <CardTitle>Usage Guide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Tailwind Utilities</h3>
              <code className="text-sm bg-muted p-2 rounded block">
                bg-primary-500 text-primary-500 border-primary-500
              </code>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Sass Variables</h3>
              <code className="text-sm bg-muted p-2 rounded block">
                colors.$color_primary_500 // HEX value
                <br />
                colors.$color_primary_500_hsl // HSL for manipulation
              </code>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Shade Selection Guide</h3>
              <ul className="text-sm space-y-1">
                <li>
                  <strong>50-200:</strong> Backgrounds, subtle states
                </li>
                <li>
                  <strong>300-400:</strong> Hover states, borders
                </li>
                <li>
                  <strong>500:</strong> Base/default color (brand identity)
                </li>
                <li>
                  <strong>600-700:</strong> Active states, emphasis
                </li>
                <li>
                  <strong>800-900:</strong> Text on light backgrounds
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
