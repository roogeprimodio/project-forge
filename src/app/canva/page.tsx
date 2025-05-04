// src/app/canva/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageIcon, Construction } from 'lucide-react'; // Import Construction icon

export default function CanvaPage() {
  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="max-w-3xl mx-auto shadow-lg">
        <CardHeader className="text-center">
           <Construction className="w-16 h-16 mx-auto mb-4 text-accent" /> {/* Use Construction icon */}
          <CardTitle className="text-2xl text-primary text-glow-primary">Canva Integration (Placeholder)</CardTitle>
          <CardDescription>Design diagrams, charts, and visuals for your project report using Canva.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Placeholder content */}
          <div className="p-6 border rounded-md bg-muted/30 text-center">
            <ImageIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">This screen will provide tools or an interface to integrate with Canva.</p>
             <p className="text-muted-foreground mt-2">Imagine embedding a Canva editor or linking Canva designs here.</p>
          </div>
           <div className="text-center mt-6">
            <p className="text-sm text-muted-foreground">(This is a placeholder screen - Under Construction)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```