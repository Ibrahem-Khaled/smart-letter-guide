import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';

interface Robot3DProps {
  speaking: boolean;
  message?: string;
}

// Component for the 3D Robot Model
function RobotModel({ speaking }: { speaking: boolean }) {
  const { scene } = useGLTF('/robot-model.glb');
  const modelRef = useRef<THREE.Group>(null);

  // Clone the scene to avoid issues with multiple instances
  scene.clone();

  useFrame((state) => {
    const group = modelRef.current;
    if (!group) return;

    const baseScale = 17;
    const pulse = speaking ? 1 + Math.sin(state.clock.elapsedTime * 4) * 0.06 : 1;

    group.scale.setScalar(baseScale * pulse);
    group.position.set(0, -1.2 + Math.sin(state.clock.elapsedTime * 1.2) * 0.15, 0);

    // إيقاف الدوران التلقائي - لا يدور النموذج حول نفسه
    // const rotationSpeed = speaking ? 0.018 : 0.0035;
    // group.rotation.y += rotationSpeed;
  });

  return (
    <group ref={modelRef}>
      <primitive object={scene.clone()} />
    </group>
  );
}

export function Robot3D({ speaking, message }: Robot3DProps) {
  return (
    <div className="robot-3d-container">
      <div className="robot-canvas-wrapper">
        <Canvas
          camera={{ position: [0, 1.5, 26], fov: 55 }}
          style={{ width: '100%', height: '100%', background: 'transparent' }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <pointLight position={[-10, -10, -5]} intensity={0.5} color="#4facfe" />
          
          <RobotModel speaking={speaking} />
          
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate={false}
            autoRotateSpeed={0.5}
            maxPolarAngle={Math.PI / 2}
            minPolarAngle={Math.PI / 2}
          />
          
          <Environment preset="city" />
        </Canvas>
      </div>
      
      {message && (
        <div className="speech-bubble">
          <div className="speech-text">{message}</div>
        </div>
      )}
    </div>
  );
}
