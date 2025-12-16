import { ReactThreeFiber } from '@react-three/fiber'
import { Object3DNode } from '@react-three/fiber'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      ambientLight: any
      pointLight: any
      group: any
      mesh: any
      points: any
      bufferGeometry: any
      bufferAttribute: any
      instancedMesh: any
      boxGeometry: any
      sphereGeometry: any
      meshStandardMaterial: any
      foliageMaterial: any
    }
  }
}
