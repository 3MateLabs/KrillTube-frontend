import * as package_onchain_1 from "../_dependencies/onchain/0x1/init";
import * as package_onchain_2 from "../_dependencies/onchain/0x2/init";
import * as package_onchain_414cdef54dcf8b37cf3201fa519b53aa555bb876d161679aea91923cff9977fc from "../tunnel/init";
import {StructClassLoader} from "./loader";

function registerClassesOnchain(loader: StructClassLoader) { package_onchain_1.registerClasses(loader);
package_onchain_2.registerClasses(loader);
package_onchain_414cdef54dcf8b37cf3201fa519b53aa555bb876d161679aea91923cff9977fc.registerClasses(loader);
 }

export function registerClasses(loader: StructClassLoader) { registerClassesOnchain(loader); }
