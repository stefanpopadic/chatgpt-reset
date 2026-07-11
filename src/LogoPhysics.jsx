import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import Matter from "matter-js";

const MAX_VISIBLE_LOGOS = 140;
const LOGO_ASSET = "/assets/openai-mark.svg";
const LOGO_SIZE = 48;

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

export const LogoPhysics = forwardRef(function LogoPhysics(_, ref) {
  const [tokens, setTokens] = useState([]);
  const engineRef = useRef(null);
  const runnerRef = useRef(null);
  const bodiesRef = useRef(new Map());
  const elementsRef = useRef(new Map());
  const tokenOrderRef = useRef([]);
  const boundariesRef = useRef([]);
  const nextIdRef = useRef(0);

  const rebuildBoundaries = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;

    Matter.Composite.remove(engine.world, boundariesRef.current);

    const width = window.innerWidth;
    const height = window.innerHeight;
    const wallOptions = {
      isStatic: true,
      friction: 0.95,
      restitution: 0.18,
    };
    const boundaries = [
      Matter.Bodies.rectangle(width / 2, height + 5, width + 200, 90, wallOptions),
      Matter.Bodies.rectangle(-30, height / 2, 60, height * 3, wallOptions),
      Matter.Bodies.rectangle(width + 30, height / 2, 60, height * 3, wallOptions),
    ];

    boundariesRef.current = boundaries;
    Matter.Composite.add(engine.world, boundaries);
  }, []);

  useEffect(() => {
    const engine = Matter.Engine.create({
      gravity: { x: 0, y: 1, scale: 0.00135 },
    });
    const runner = Matter.Runner.create({ delta: 1000 / 60 });

    engineRef.current = engine;
    runnerRef.current = runner;
    rebuildBoundaries();

    const syncElements = () => {
      bodiesRef.current.forEach(({ body, size }, id) => {
        const element = elementsRef.current.get(id);
        if (!element) return;

        element.style.transform = `translate3d(${body.position.x - size / 2}px, ${body.position.y - size / 2}px, 0) rotate(${body.angle}rad)`;
      });
    };

    Matter.Events.on(engine, "afterUpdate", syncElements);
    Matter.Runner.run(runner, engine);
    window.addEventListener("resize", rebuildBoundaries);

    return () => {
      window.removeEventListener("resize", rebuildBoundaries);
      Matter.Events.off(engine, "afterUpdate", syncElements);
      Matter.Runner.stop(runner);
      Matter.Composite.clear(engine.world, false);
      Matter.Engine.clear(engine);
      engineRef.current = null;
      runnerRef.current = null;
    };
  }, [rebuildBoundaries]);

  const spawn = useCallback(({ x, y } = {}) => {
    const engine = engineRef.current;
    if (!engine) return;

    const size = LOGO_SIZE;
    const id = `logo-${nextIdRef.current++}`;
    const originX = x ?? randomBetween(size, window.innerWidth - size);
    const originY = y ?? Math.max(120, window.innerHeight * 0.38);
    const body = Matter.Bodies.circle(originX, originY, size / 2, {
      density: 0.0014,
      friction: 0.82,
      frictionAir: 0.006,
      restitution: 0.42,
    });

    Matter.Body.setVelocity(body, {
      x: randomBetween(-11, 11),
      y: randomBetween(-17, -10),
    });
    Matter.Body.setAngularVelocity(body, randomBetween(-0.24, 0.24));

    bodiesRef.current.set(id, { body, size });
    tokenOrderRef.current.push(id);
    Matter.Composite.add(engine.world, body);
    setTokens((current) => [...current, { id, size }]);

    if (tokenOrderRef.current.length > MAX_VISIBLE_LOGOS) {
      const oldestId = tokenOrderRef.current.shift();
      const oldest = bodiesRef.current.get(oldestId);
      if (oldest) Matter.Composite.remove(engine.world, oldest.body);
      bodiesRef.current.delete(oldestId);
      elementsRef.current.delete(oldestId);
      setTokens((current) => current.filter((token) => token.id !== oldestId));
    }
  }, []);

  useImperativeHandle(ref, () => ({ spawn }), [spawn]);

  return (
    <div className="physics-field" aria-hidden="true">
      {tokens.map((token) => (
        <span
          className="physics-logo"
          key={token.id}
          ref={(element) => {
            if (element) elementsRef.current.set(token.id, element);
            else elementsRef.current.delete(token.id);
          }}
          style={{ height: token.size, width: token.size }}
        >
          <img alt="" draggable="false" src={LOGO_ASSET} />
        </span>
      ))}
    </div>
  );
});
