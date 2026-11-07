// Mounted on every page: keeps the title and the meta tags of the head in step with the route.
import SeoHead from "./seo/SeoHead";

export default function Extensions() {
  return <SeoHead />;
}
