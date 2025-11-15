import * as tunnel from "./tunnel/structs";
import {StructClassLoader} from "../_framework/loader";

export function registerClasses(loader: StructClassLoader) { loader.register(tunnel.ClaimReceipt);
loader.register(tunnel.CloseInitiated);
loader.register(tunnel.CreatorConfig);
loader.register(tunnel.CreatorConfigCreated);
loader.register(tunnel.FundsClaimed);
loader.register(tunnel.PaymentProcessed);
loader.register(tunnel.ReceiverConfig);
loader.register(tunnel.Tunnel);
loader.register(tunnel.TunnelClosed);
loader.register(tunnel.TunnelOpened);
 }
