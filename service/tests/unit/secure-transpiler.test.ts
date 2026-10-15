import { SecureTranspiler } from '../../src/utils/secure-transpiler';

describe('SecureTranspiler', () => {
  it('rejects eval three times in a row (no stateful regex)', () => {
    for (let i = 0; i < 3; i += 1) {
      expect(() => SecureTranspiler.validateCode('const a = eval(x);')).toThrow(
        /unsafe code/
      );
    }
  });

  it('rejects window access', () => {
    expect(() => SecureTranspiler.validateCode('window.location = "x"')).toThrow();
  });

  it('rejects sources over 50 000 characters', () => {
    expect(() => SecureTranspiler.validateCode('a'.repeat(50_001))).toThrow(/maximum size/);
  });

  it('transpiles a plain component', () => {
    const out = SecureTranspiler.transpile(
      'const Component = () => <div>hi</div>;',
      'Component'
    );
    expect(out).toContain('(function(React)');
    expect(out).toContain('React.createElement');
  });
});
