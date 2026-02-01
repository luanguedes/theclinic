import jsPDF from 'jspdf';
import { formatDateDMY } from './date';

export const generateConflictReport = (pacientes, motivoBloqueio) => {
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
    });

    const primaryColor = [37, 99, 235];   // Blue 600
    const accentColor = [220, 38, 38];    // Red 600 (para indicar cancelamento/conflito)
    const secondaryColor = [100, 116, 139]; // Slate 500
    const textColor = [30, 41, 59];      // Slate 800
    const rowAltColor = [248, 250, 252]; // Slate 50

    const marginLeft = 14;
    const contentWidth = 182;
    let y = 20;

    // ================= 1. CABEÇALHO PROFISSIONAL =================
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("RELATÓRIO DE CONFLITOS DE AGENDA", marginLeft, y);
    
    y += 8;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(`MOTIVO DO BLOQUEIO: ${motivoBloqueio.toUpperCase()}`, marginLeft, y);
    doc.text(`EMISSÃO: ${new Date().toLocaleString('pt-BR')}`, 196, y, { align: 'right' });

    y += 4;
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.8);
    doc.line(marginLeft, y, 196, y);

    // ================= 2. CABEÇALHO DA TABELA =================
    y += 12;
    doc.setFillColor(51, 65, 85); // Slate 700
    doc.rect(marginLeft, y - 5, contentWidth, 8, 'F');
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    
    doc.text("DATA / HORA", marginLeft + 2, y);
    doc.text("MÉDICO RESPONSÁVEL", marginLeft + 35, y);
    doc.text("PACIENTE / IDENTIFICAÇÃO", marginLeft + 85, y);
    doc.text("CONTATO", marginLeft + 155, y);

    y += 8;

    // ================= 3. LISTAGEM DE PACIENTES =================
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    
    pacientes.forEach((p, index) => {
        // Controle de nova página
        if (y > 275) {
            doc.addPage();
            y = 25;
            // Repetir cabeçalho da tabela na nova página se necessário
        }

        // Fundo zebrado
        if (index % 2 === 0) {
            doc.setFillColor(rowAltColor[0], rowAltColor[1], rowAltColor[2]);
            doc.rect(marginLeft, y - 5, contentWidth, 12, 'F');
        }

        const dataF = formatDateDMY(p.data);
        const horaF = p.horario.substring(0, 5);
        const nascimento = p.paciente_nascimento ? formatDateDMY(p.paciente_nascimento) : 'N/D';

        // Coluna 1: Data e Hora
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(`${dataF}`, marginLeft + 2, y);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(`${horaF}`, marginLeft + 2, y + 4);

        // Coluna 2: Médico
        doc.setFontSize(8);
        const medico = p.medico.length > 28 ? p.medico.substring(0, 25) + '...' : p.medico;
        doc.text(medico.toUpperCase(), marginLeft + 35, y + 2);

        // Coluna 3: Paciente
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(p.paciente_nome.toUpperCase(), marginLeft + 85, y);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.text(`CPF: ${p.paciente_cpf || '---'} | NASC: ${nascimento}`, marginLeft + 85, y + 4);
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);

        // Coluna 4: Contato
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(p.paciente_telefone || "(S/ TEL)", marginLeft + 155, y + 2);
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);

        y += 12; // Espaçamento entre linhas
    });

    // ================= 4. RESUMO FINAL =================
    y += 5;
    if (y > 260) { doc.addPage(); y = 30; }

    doc.setFillColor(254, 242, 242); // Red 50
    doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.roundedRect(marginLeft, y, 60, 20, 2, 2, 'FD');

    doc.setFontSize(8);
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.text("RESUMO DE CONFLITOS", marginLeft + 5, y + 7);
    doc.setFontSize(14);
    doc.text(`${pacientes.length} PACIENTES`, marginLeft + 5, y + 15);

    // Instrução para a recepção
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text("Ação recomendada: Entrar em contato para remanejamento de horários.", marginLeft + 70, y + 15);

    // ================= 5. RODAPÉ E PAGINAÇÃO =================
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text(
            `Página ${i} de ${totalPages} - TheClinic System`,
            105, 290, { align: 'center' }
        );
    }

    window.open(doc.output('bloburl'), '_blank');
};
