#  Simple DeFi Yield Farming

La Farm debe permitir a los usuarios realizar depósitos y retiros de un token mock LP.
Los usuarios también pueden reclamar las recompensas generadas durante el staking. Estas recompensas son tokens de la plataforma: nombre: "DApp Token", token: "DAPP"


## 📦 Requisitos

- Node.js >= 18
- npm o yarn
- Hardhat

---

## ⚙️ Instalación

```bash
git clone https://github.com/flaviobovio/FarmDeFi.git
cd FarmDeFi
npm install
```

---

## 🔨 Compilar y 🚀 deployear el contrato y en entorno local

En una terminal iniciar de testing (No cerrar)
```bash
npx hardhat node
```

En otra terminal compilar y deployear
```bash
npx hardhat compile
npx hardhat ignition deploy ignition/modules/TokenFarm.ts --network localhost
```

Comandos útiles en caso de error
```bash
rm -rf artifacts cache ignition/deployments
npx hardhat clean
npx hardhat node
npx hardhat compile
npx hardhat ignition deploy ignition/modules/TokenFarm.ts --network localhost --reset
```


---

## 🧪 Testear

Ejecutar los tests en `test/`:

```bash
npx hardhat test
```

---



## 🧾 Scripts interactivos

Ejecutar el script para interactuar con el contrato:

De forma automática
```bash
npx hardhat run scripts/InteractAuto.ts
```
Paso a paso
```bash
npx hardhat run scripts/InteractManual.ts
```