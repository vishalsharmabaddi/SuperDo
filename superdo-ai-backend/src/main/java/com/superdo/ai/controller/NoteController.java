package com.superdo.ai.controller;

import com.superdo.ai.dto.NoteRequest;
import com.superdo.ai.entity.Note;
import com.superdo.ai.security.UserPrincipal;
import com.superdo.ai.service.NoteService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/notes")
public class NoteController {

    private final NoteService noteService;

    public NoteController(NoteService noteService) {
        this.noteService = noteService;
    }

    @GetMapping
    public List<Note> list(@AuthenticationPrincipal UserPrincipal principal,
                           @RequestParam(required = false) String query) {
        return noteService.list(principal.getId(), query);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Note create(@AuthenticationPrincipal UserPrincipal principal,
                       @Valid @RequestBody NoteRequest request) {
        return noteService.create(principal.getId(), request);
    }

    @PutMapping("/{id}")
    public Note update(@AuthenticationPrincipal UserPrincipal principal,
                       @PathVariable Long id,
                       @Valid @RequestBody NoteRequest request) {
        return noteService.update(principal.getId(), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal UserPrincipal principal,
                       @PathVariable Long id) {
        noteService.delete(principal.getId(), id);
    }
}
