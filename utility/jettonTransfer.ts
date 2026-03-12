import { beginCell, Address, toNano } from "@ton/core";
import { SendTransactionRequest } from "@tonconnect/ui-react";
import { fromDecimals } from "./decimals";
import { isValidAddress } from "./address";

// Jetton balance interface (compatible with our app)
interface JettonBalance {
  balance: string;
  jetton: {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
  };
  walletAddress?: {
    address: string;
  };
}

/**
 * Create a jetton transfer transaction
 * @param jetton - Jetton balance data
 * @param amountStr - Amount to send as string (e.g., "1.5")
 * @param recipientAddressStr - Recipient address
 * @param senderAddress - Sender address
 * @param jettonWalletAddress - Jetton wallet address (optional, will use from jetton if not provided)
 * @returns Transaction request for TonConnect
 */
export const getJettonTransaction = (
  jetton: JettonBalance,
  amountStr: string,
  recipientAddressStr: string,
  senderAddress: Address,
  jettonWalletAddress?: string
): SendTransactionRequest => {
  // Convert amount to bigint
  const amount = fromDecimals(amountStr, jetton.jetton.decimals);

  // Validate recipient address
  if (!isValidAddress(recipientAddressStr)) {
    throw new Error("Invalid recipient address format");
  }

  // Validate amount
  if (amount <= 0n) {
    throw new Error("Amount must be greater than zero");
  }

  // Check balance
  const balance = BigInt(jetton.balance);
  if (amount > balance) {
    throw new Error("Amount exceeds available balance");
  }

  const recipient = Address.parse(recipientAddressStr);

  // Build jetton transfer message body
  const body = beginCell()
    .storeUint(0xf8a7ea5, 32) // jetton transfer operation
    .storeUint(0, 64) // query ID
    .storeCoins(amount) // jetton amount
    .storeAddress(recipient) // destination address
    .storeAddress(senderAddress) // response address
    .storeUint(0, 1) // null custom payload
    .storeCoins(toNano("0.01")) // forward TON amount (for notification)
    .storeUint(0, 1) // null forward payload
    .endCell();

  // Get jetton wallet address
  const walletAddr = jettonWalletAddress || jetton.walletAddress?.address;
  if (!walletAddr) {
    throw new Error("Jetton wallet address not available");
  }

  return {
    validUntil: Math.floor(Date.now() / 1000) + 300, // valid for 5 minutes
    messages: [
      {
        address: walletAddr,
        amount: toNano("0.05").toString(), // gas fee
        payload: body.toBoc().toString("base64"),
      },
    ],
  };
};

/**
 * Estimate gas fee for jetton transfer
 * @returns Gas fee in TON
 */
export function estimateJettonTransferFee(): string {
  return "0.05"; // Standard jetton transfer fee
}
