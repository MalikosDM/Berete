// The extensions mounted on every page - written by the platform. Do not edit.
import SeoHead from "./seo/SeoHead";
import PageViews from "./analytics/PageViews";

export default function Extensions() {
  return (
    <>
      <SeoHead />
      <PageViews />
    </>
  );
}
