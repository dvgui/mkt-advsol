import * as Sodium from 'sodium-native';
import { ec as EC } from 'elliptic';
import { sha256 } from '@noble/hashes/sha256';
import * as Noble from '@noble/secp256k1';
import { keccak256 } from 'ethereumjs-util';
import BN from 'bn.js';
import { ethers } from 'hardhat';
import { BigNumberish } from 'ethers';

const secp256k1 = new EC('secp256k1');

export const toBN = (n: BigNumberish) => ethers.BigNumber.from(n);
export const toWei = (n: BigNumberish) => ethers.BigNumber.from(10).pow(18).mul(n);
export const toEth = (n: BigNumberish) => ethers.BigNumber.from(10).div(toWei(1)).mul(n);

export type ECDSASignature = {
  signature: string;
  recoveryId: number;
};
/*
export type Signature = {
  r: BN;
  s: BN;
  v: BN;
};
*/
export function randomBytes(size: number): Buffer {
  const b = Buffer.allocUnsafe(size);
  Sodium.randombytes_buf(b);
  return b;
}

export function generateKeys(): string {
  if (!secp256k1.n) {
    throw new Error('Invalid Curve');
  }

  const keys = secp256k1.genKeyPair({
    entropy: randomBytes(secp256k1.n.byteLength()),
    entropyEnc: 'hex'
  });

  return keys.getPrivate().toString('hex', 32);
}

export function hashMessage(message: Buffer) {
  return sha256(sha256(message));
}

export function keccakHash(message: Buffer) {
  return keccak256(message);
}

export function getPaddedValue(value: BigNumberish, bytes: number): string {
  const converted = toBN(value);
  const convertedHex = converted.toHexString().replace('0x', '');
  const hexLength = bytes * 2;

  if (convertedHex.length >= hexLength) {
    return convertedHex;
  }

  return convertedHex.padStart(hexLength, '0');
}

export async function ecdsaSignature(message: Buffer, privateKey: string): Promise<ECDSASignature> {
  const key = Buffer.from(privateKey.replace('0x', ''), 'hex');

  const [signature, recovery] = await Noble.sign(message, key, {
    canonical: true,
    recovered: true
  });

  const signatureHex = Buffer.from(signature).toString('hex');
  const signatureCompact = Noble.Signature.fromHex(signatureHex).normalizeS().toCompactHex();

  return {
    signature: signatureCompact,
    recoveryId: recovery
  };
}

export function getPublicKeyFromPrivate(privateKey: string, compressed = false): string {
  const keys = secp256k1.keyFromPrivate(privateKey);
  const { result } = keys.validate();

  if (!result) {
    throw new Error('Invalid Private Key');
  }

  return keys.getPublic(compressed, 'hex');
}

export function getAddressFromPublicKey(publicKey: string): string {
  // 0x04 prefix needs to be removed
  const keyBuffer = Buffer.from(publicKey, 'hex');
  const formattedKey = keyBuffer.slice(1, keyBuffer.length);

  const address = keccak256(formattedKey).toString('hex');

  // Last 20 bytes are the ethereum addresss
  const ethereum = address.slice(-40);
  return ethereum;
}

export function getAddressFromPrivateKey(privateKey: string): string {
  const publicKey = getPublicKeyFromPrivate(privateKey, false);
  return getAddressFromPublicKey(publicKey);
}

export function zeros(bytes: number): Buffer {
  return Buffer.allocUnsafe(bytes).fill(0);
}

export function setLength(msg: Buffer, length: number, right: boolean) {
  const buf = zeros(length);
  if (right) {
    if (msg.length < length) {
      msg.copy(buf);
      return buf;
    }
    return msg.slice(0, length);
  }

  if (msg.length < length) {
    msg.copy(buf, length - msg.length);
    return buf;
  }
  return msg.slice(-length);
}

export function setLengthLeft(msg: Buffer, length: number) {
  return setLength(msg, length, false);
}

export function calculateSigRecovery(v: BN, chainId?: string): BN {
  if (!chainId) {
    return v.subn(27);
  }
  const chainIdBN = new BN(chainId);
  return v.sub(chainIdBN.muln(2).addn(35));
}

export function isValidSigRecovery(recovery: number | BN): boolean {
  const rec = new BN(recovery);
  return rec.eqn(0) || rec.eqn(1);
}

export function recoverPublicKey(messageHash: Buffer, signature: string, recovery: number): string {
  if (!isValidSigRecovery(recovery)) {
    throw new Error('Invalid signature v value');
  }

  const senderPubKey = Noble.recoverPublicKey(messageHash, signature, recovery);

  const recovered = Noble.Point.fromHex(senderPubKey).toRawBytes(false);
  return Buffer.from(recovered).toString('hex');
}

export function timeConverter(UNIX_timestamp: number) {
  const a = new Date(UNIX_timestamp * 1000);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const year = a.getFullYear();
  const month = months[a.getMonth()];
  const date = a.getDate();
  const hour = zeroPad(a.getHours(), 2);
  const min = zeroPad(a.getMinutes(), 2);
  const sec = zeroPad(a.getSeconds(), 2);
  const time = `${date} ${month} ${year} ${hour}:${min}:${sec}`;
  return time;
}
const zeroPad = (num: number, places: number) => String(num).padStart(places, '0');
