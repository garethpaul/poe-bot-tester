export class SseDataDecoder<T extends object = Record<string, unknown>> {
  private bufferedLine = '';

  push(text: string): T[] {
    this.bufferedLine += text;

    const lines = this.bufferedLine.split(/\r?\n/);
    this.bufferedLine = lines.pop() ?? '';

    return lines.flatMap(line => this.parseLine(line));
  }

  finish(): T[] {
    const finalLine = this.bufferedLine;
    this.bufferedLine = '';

    return finalLine ? this.parseLine(finalLine) : [];
  }

  private parseLine(line: string): T[] {
    if (!line.startsWith('data:')) {
      return [];
    }

    const encoded = line.slice(5).replace(/^ /, '');
    if (!encoded) {
      return [];
    }

    try {
      const parsed: unknown = JSON.parse(encoded);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return [];
      }

      return [parsed as T];
    } catch {
      return [];
    }
  }
}
