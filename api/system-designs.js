import listSystemDesigns from "../lib/handlers/list-system-designs.js";
import { withErrors } from "../lib/wrap.js";

export default withErrors(listSystemDesigns);
